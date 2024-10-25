const supabase = require("../config/supabase");

exports.fetchConversations = async (user_id) => {
    
    const { data, error } = await supabase
        .from("conversation_participants")
        .select(`
            *,
            conversations (
                *
            )
        `)
        .eq("user_id", user_id)
        .order("last_read_at", { ascending: false })
        

    if (error) {
        console.error("Error fetching conversations:", error);
        throw error;
    }

        // Create a map to filter out duplicates based on conversation_id
        const uniqueConversations = {};
        data.forEach(convo => {
            const conversationId = convo.conversation_id;
            if (!uniqueConversations[conversationId]) {
                uniqueConversations[conversationId] = convo; // Store the first occurrence
            }
        });
    
        // Convert the map back to an array
        return Object.values(uniqueConversations);
};

exports.addConversation = async () => {
    const { data, error } = await supabase
        .from("conversations")
        .insert([{}])
        .select();

    if (error) {
        console.error("Error creating new conversation:", error);
        throw error;
    }
    console.log("data in addConversation:", data);
    return data[0];
};

const deleteConversation = async (conversation_id) => {
    const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("conversation_id", conversation_id)

    if (error) {
        console.error("Error deleting conversation:", error);
        throw error;
    }
};

const updateIsGroupStatus = async (conversation_id) => {
    const { count, error } = await supabase
        .from("conversation_participants")
        .select("user_id", { count: "exact", head: true })
        .eq("conversation_id", conversation_id);

    if (error) {
        console.error("Error counting participants:", error);
        throw error;
    }

    const isGroup = count > 2;

    const { error: updateError } = await supabase
        .from("conversations")
        .update({ is_group: isGroup })
        .eq("conversation_id", conversation_id);

    if (updateError) {
        console.error("Error updating group status:", updateError);
        throw updateError;
    }
};

exports.markConversationAsRead = async (conversation_id, user_id) => {
    const { error } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date() })
        .eq("conversation_id", conversation_id)
        .eq("user_id", user_id);

    if (error) {
        console.error("Error updating last read timestamp:", error);
        throw error;
    }
};

exports.addConversationParticipants = async (conversation_id, users) => {
    
    const participants = users.map(user_id => ({
        conversation_id,
        user_id,
    }));

    const { data, error } = await supabase
        .from("conversation_participants")
        .insert(participants)
        .select("*");

    if (error) {
        console.error("Error adding conversation participants:", error);
        throw error;
    }
console.log("addParticipants data:", data);
    await updateIsGroupStatus(conversation_id);
};

exports.removeConversationParticipant = async (user_id, conversation_id) => {
    // Step 1: Remove the participant
    const { count: deleteCount, error } = await supabase
        .from("conversation_participants")
        .delete({ count: "exact" })
        .eq("conversation_id", conversation_id)
        .eq("user_id", user_id);

    if (error) {
        console.error("Error removing participant:", error);
        throw error;
    }

    // Check if a participant was actually removed
    if (deleteCount === 0) {
        throw new Error("Participant not found for the given conversation_id and user_id.");
    }

    // Step 2: Check the count of remaining participants
    const { count: remainingCount, error: countError } = await supabase
        .from("conversation_participants")
        .select("user_id", { count: "exact", head: true })
        .eq("conversation_id", conversation_id);

    if (countError) {
        console.error("Error counting participants:", countError);
        throw countError;
    }

    // Step 3: Delete the conversation if no participants remain
    if (remainingCount === 0) {
        await deleteConversation(conversation_id);
    } else {
        await updateIsGroupStatus(conversation_id);
    }
};