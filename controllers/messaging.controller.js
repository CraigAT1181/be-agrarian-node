const {
    fetchConversations,
    addConversation,
    addConversationParticipants,
    removeConversationParticipant,
    fetchMessages,
    postMessage,
    uploadMessageMedia,
    saveMessageMedia,
    removeMessage,
    deleteMediaFromStorage
} = require("../models/messaging.model");

// Retrieve all conversations for a user
exports.getConversations = async (req, res, next) => {
    const { user_id } = req.params;

    try {
        const conversations = await fetchConversations(user_id);
        res.status(200).json(conversations);
    } catch (error) {
        console.error("Error retrieving conversations:", error);
        next(error);
    }
};

// Start a new conversation and add the initiating user as a participant
exports.startConversation = async (req, res, next) => {
    const { user_id } = req.params;

    try {
        const newConversation = await addConversation();

        if (!newConversation || !newConversation.conversation_id) {
            throw new Error("Failed to create conversation.");
        }

        const conversation_id = newConversation.conversation_id;

        await addConversationParticipants(conversation_id, [user_id]);

        res.status(201).json({ message: "New conversation started.", conversation_id });
    } catch (error) {
        console.error("Error starting new conversation:", error);
        next(error);
    }
};

// Remove a user from a conversation
exports.exitConversation = async (req, res, next) => {
    const { user_id, conversation_id } = req.params;

    try {
        await removeConversationParticipant(user_id, conversation_id);

        res.status(204).end(); // Successfully removed participant
    } catch (error) {
        console.error("Error exiting conversation:", error);
        next(error);
    }
};

// Retrieve all messages in a conversation
exports.getMessages = async (req, res, next) => {
    const { conversation_id } = req.params;

    try {
        const messages = await fetchMessages(conversation_id);
        res.status(200).json(messages);
    } catch (error) {
        console.error("Error retrieving messages:", error);
        next(error);
    }
};

// Add a new message with optional media upload
exports.addMessage = async (req, res, next) => {
    const { conversation_id, sender_id, recipient_id, content } = req.body;
    const files = req.files;

    try {
        const messageDetails = { conversation_id, sender_id, recipient_id, content };
        const newMessage = await postMessage(messageDetails);
        const message_id = newMessage.message_id;

        let mediaURLs = [];

        if (files && files.length > 0) {
            mediaURLs = await uploadMessageMedia(message_id, files);
            await saveMessageMedia(message_id, mediaURLs);
        }

        res.status(200).json({ message: newMessage, mediaURLs });
    } catch (error) {
        console.error("Error adding message:", error);
        next(error);
    }
};

// Delete a message and its associated media from storage
exports.deleteMessage = async (req, res, next) => {
    const { message_id } = req.body;

    if (!message_id) {
        return res.status(400).json({ error: "message_id is required" });
    }

    try {
        const { error: messageError } = await removeMessage(message_id);
        if (messageError) {
            console.error("Error removing message:", messageError.message);
            return res.status(500).json({ error: messageError.message });
        }

        const { error: storageError } = await deleteMediaFromStorage(message_id);
        if (storageError) {
            console.error("Error deleting media from storage:", storageError.message);
            return res.status(500).json({ error: storageError.message });
        }

        res.status(204).send(); // Successfully deleted
    } catch (error) {
        console.error("Error deleting message:", error);
        next(error);
    }
};
