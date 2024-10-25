const { fetchConversations, addConversation, addConversationParticipants, removeConversationParticipant } = require("../models/messaging.model")

exports.getConversations = async (req, res, next) => {

    const {user_id} = req.params;

    try {
        const conversations = await fetchConversations(user_id);
        res.status(200).json(conversations);
    } catch (error) {
        next(error);
    }
};

exports.startConversation = async (req, res, next) => {
    const { user_id } = req.params;

    try {
        // Start a new conversation
        const newConversation = await addConversation();
        
        if (!newConversation || !newConversation.conversation_id) {
            throw new Error("Failed to create conversation.");
        }

        const conversation_id = newConversation.conversation_id;

        // Add the initiating user as a participant
        await addConversationParticipants(conversation_id, [user_id]);

        // Respond with success and include the conversation_id if needed
        res.status(201).json({ message: "New conversation started.", conversation_id });
    } catch (error) {
        next(error);
    }
};

exports.exitConversation = async (req, res, next) => {
    const { user_id, conversation_id } = req.params;

    try {
        await removeConversationParticipant(user_id, conversation_id);

        res.status(204).end();
        
    } catch (error) {
        next(error);
    }
};
