const chatService = require('../services/chat.service');

const handleIncoming = async (req, res, next) => {
  try {
    const payload = req.body || {};
    if (!payload.from) {
      const error = new Error('Sender is required');
      error.status = 400;
      throw error;
    }
    const result = await chatService.processIncomingMessage(payload);
    res.status(202).json({
      success: true,
      data: {
        caseId: result.case.id,
        chatMessageId: result.chatMessage.id
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  handleIncoming
};
