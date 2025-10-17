const { getPrisma } = require('../config/prisma.config');
const { toNullableDecimal } = require('../utils/prisma-helpers');

const ALLOWED_STATUS = ['IN_CHATBOT', 'WAITING_DOCTOR', 'MILD', 'MODERATE', 'SEVERE'];
const ALLOWED_SEVERITY = ['MILD', 'MODERATE', 'SEVERE'];
const ALLOWED_ASSIGNED = ['ALL', 'MINE', 'UNASSIGNED'];

const parseEnumList = (value, allowed) => {
  if (value === undefined || value === null) {
    return [];
  }
  const values = Array.isArray(value) ? value : String(value).split(',');
  const normalized = values
    .map((entry) => String(entry || '').trim().toUpperCase())
    .filter((entry) => allowed.includes(entry));
  return Array.from(new Set(normalized));
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const sanitizeSearchTerm = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
};

const parseAssignedFilter = (value) => {
  if (!value) {
    return 'ALL';
  }
  const normalized = String(value).trim().toUpperCase();
  if (!ALLOWED_ASSIGNED.includes(normalized)) {
    return 'ALL';
  }
  return normalized;
};

const buildWhereFilters = ({ statusList, severityList, dateFrom, dateTo, searchTerm, assignedFilter, doctorId }) => {
  const filters = [];
  if (statusList.length > 0) {
    filters.push({ status: { in: statusList } });
  }
  if (severityList.length > 0) {
    filters.push({ severity_class: { in: severityList } });
  }
  if (assignedFilter === 'MINE' && doctorId) {
    filters.push({ doctor_id: doctorId });
  } else if (assignedFilter === 'UNASSIGNED') {
    filters.push({ doctor_id: null });
  }
  const createdAt = {};
  if (dateFrom) {
    createdAt.gte = dateFrom;
  }
  if (dateTo) {
    createdAt.lte = dateTo;
  }
  if (Object.keys(createdAt).length > 0) {
    filters.push({ created_at: createdAt });
  }
  if (searchTerm) {
    const digits = searchTerm.replace(/\D/g, '');
    const phoneCandidates = [searchTerm];
    if (digits && digits !== searchTerm) {
      phoneCandidates.push(digits);
    }
    const phoneFilters = phoneCandidates.map((candidate) => ({
      users: {
        phone_number: {
          contains: candidate,
          mode: 'insensitive'
        }
      }
    }));
    filters.push({
      OR: [
        {
          users: {
            display_name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        },
        ...phoneFilters
      ]
    });
  }
  return filters;
};

const buildWhereClause = (filters) => {
  if (!filters || filters.length === 0) {
    return {};
  }
  return { AND: filters };
};

const mapCaseSummary = (record) => {
  const latestChat = Array.isArray(record.chat_messages) && record.chat_messages.length > 0 ? record.chat_messages[0] : null;
  return {
    id: record.id,
    status: record.status,
    severityClass: record.severity_class,
    severityScore: toNullableDecimal(record.severity_score),
    sputumCategory: record.sputum_category,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    patient: record.users
      ? {
          id: record.users.id,
          displayName: record.users.display_name,
          phoneNumber: record.users.phone_number
        }
      : null,
    latestMessageAt: latestChat ? latestChat.created_at : null,
    triageMetadata: record.triage_metadata && typeof record.triage_metadata === 'object' ? record.triage_metadata : {}
  };
};

const convertGroupToMap = (groups, keyField) => {
  return groups.reduce((acc, group) => {
    const key = group[keyField];
    if (!key) {
      return acc;
    }
    acc[key] = group._count ? group._count._all : 0;
    return acc;
  }, {});
};

const listCases = async (req, res, next) => {
  try {
    const statusList = req.query.status === undefined ? ['WAITING_DOCTOR'] : parseEnumList(req.query.status, ALLOWED_STATUS);
    const severityList = parseEnumList(req.query.severityClass, ALLOWED_SEVERITY);
    const dateFrom = parseDate(req.query.dateFrom);
    const dateTo = parseDate(req.query.dateTo);
    const searchTerm = sanitizeSearchTerm(req.query.search);
    const assignedFilter = parseAssignedFilter(req.query.assigned);
    const doctorId = req.user ? req.user.id : null;
    const pageRaw = Number.parseInt(req.query.page, 10);
    const pageSizeRaw = Number.parseInt(req.query.pageSize, 10);
    const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;
    const pageSize = Number.isNaN(pageSizeRaw) || pageSizeRaw < 1 ? 20 : Math.min(pageSizeRaw, 100);
    const skip = (page - 1) * pageSize;

    const filters = buildWhereFilters({
      statusList,
      severityList,
      dateFrom,
      dateTo,
      searchTerm,
      assignedFilter,
      doctorId
    });
    const where = buildWhereClause(filters);

    const prisma = getPrisma();

    const [total, caseRecords] = await Promise.all([
      prisma.cases.count({ where }),
      prisma.cases.findMany({
        where,
        orderBy: { updated_at: 'desc' },
        skip,
        take: pageSize,
        include: {
          users: {
            select: {
              id: true,
              display_name: true,
              phone_number: true
            }
          },
          chat_messages: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              created_at: true
            }
          }
        }
      })
    ]);

    let statusSummary = {};
    let severitySummary = {};
    try {
      const [statusGroups, severityGroups] = await Promise.all([
        prisma.cases.groupBy({
          by: ['status'],
          _count: { _all: true },
          where
        }),
        prisma.cases.groupBy({
          by: ['severity_class'],
          _count: { _all: true },
          where
        })
      ]);
      statusSummary = convertGroupToMap(statusGroups, 'status');
      severitySummary = convertGroupToMap(severityGroups, 'severity_class');
    } catch {
      const fallback = caseRecords.map((record) => ({
        status: record.status,
        severity_class: record.severity_class
      }));
      statusSummary = fallback.reduce((acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1;
        return acc;
      }, {});
      severitySummary = fallback.reduce((acc, record) => {
        if (!record.severity_class) {
          return acc;
        }
        acc[record.severity_class] = (acc[record.severity_class] || 0) + 1;
        return acc;
      }, {});
    }

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    res.status(200).json({
      success: true,
      data: {
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        },
        filtersApplied: {
          status: statusList,
          severityClass: severityList,
          dateFrom: dateFrom ? dateFrom.toISOString() : null,
          dateTo: dateTo ? dateTo.toISOString() : null,
          search: searchTerm,
          assigned: assignedFilter
        },
        summaries: {
          byStatus: statusSummary,
          bySeverity: severitySummary
        },
        cases: caseRecords.map(mapCaseSummary)
      }
    });
  } catch (error) {
    next(error);
  }
};

const claimCase = async (req, res, next) => {
  try {
    const { caseId } = req.params;
    const doctorContext = req.user || {};
    if (!caseId) {
      const error = new Error('caseId is required');
      error.status = 400;
      throw error;
    }
    if (!doctorContext.id) {
      const error = new Error('Authorization required');
      error.status = 401;
      throw error;
    }
    const prisma = getPrisma();
    const existing = await prisma.cases.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        doctor_id: true,
        status: true,
        triage_metadata: true,
        severity_class: true,
        severity_score: true,
        sputum_category: true,
        created_at: true,
        updated_at: true,
        users: {
          select: {
            id: true,
            phone_number: true,
            display_name: true
          }
        }
      }
    });
    if (!existing) {
      const error = new Error('Case not found');
      error.status = 404;
      throw error;
    }
    if (existing.doctor_id && existing.doctor_id !== doctorContext.id) {
      const error = new Error('Case is already assigned to another doctor');
      error.status = 409;
      throw error;
    }
    if (existing.status !== 'WAITING_DOCTOR' && existing.status !== 'IN_CHATBOT') {
      const error = new Error('Case is not available for claiming');
      error.status = 409;
      throw error;
    }

    const now = new Date();
    const metadata =
      existing.triage_metadata && typeof existing.triage_metadata === 'object' ? { ...existing.triage_metadata } : {};
    metadata.lastClaim = {
      at: now.toISOString(),
      doctorId: doctorContext.id
    };

    const updated = await prisma.cases.update({
      where: { id: caseId },
      data: {
        doctor_id: doctorContext.id,
        triage_metadata: metadata,
        updated_at: now
      }
    });

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        severityClass: updated.severity_class,
        severityScore: toNullableDecimal(updated.severity_score),
        sputumCategory: updated.sputum_category,
        doctorId: updated.doctor_id,
        claimedAt: now.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCases,
  __test__: {
    parseEnumList,
    parseDate,
    sanitizeSearchTerm,
    buildWhereFilters,
    buildWhereClause,
    parseAssignedFilter
  },
  claimCase
};
