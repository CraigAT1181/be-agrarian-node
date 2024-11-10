const supabase = require("../config/supabase");

exports.fetchConversations = async (user_id) => {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select(
      `
            *,
            conversations (
                *
            )
        `
    )
    .eq("user_id", user_id)
    .order("last_read_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }

  // Create a map to filter out duplicates based on conversation_id
  const uniqueConversations = {};
  data.forEach((convo) => {
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

  return data[0];
};

const deleteConversation = async (conversation_id) => {
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("conversation_id", conversation_id);

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
  const participants = users.map((user_id) => ({
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
    throw new Error(
      "Participant not found for the given conversation_id and user_id."
    );
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

exports.fetchMessages = async (conversation_id) => {
  const { data, error } = await supabase
    .from("messages")
    .select(
      `
        *,
        messages_media (

            media_url
        
        )
    `
    )
    .eq("conversation_id", conversation_id)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }

  return data;
};

exports.postMessage = async (messageDetails) => {
  const { conversation_id, sender_id, content } = messageDetails;

  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        conversation_id,
        sender_id,
        content,
      },
    ])
    .select("*");

  if (error) {
    console.error("Error posting new message:", error);
    throw error;
  }

  return data[0];
};

exports.uploadMessageMedia = async (message_id, files) => {
  try {
    let mediaURLs = [];

    for (const file of files) {
      const fileName = `${message_id}/${Date.now()}_${file.originalname}`;

      const { data, error } = await supabase.storage
        .from("messages-media")
        .upload(fileName, file.buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.mimetype,
        });

      if (error) {
        console.error("Error uploading media file:", error);
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from("messages-media")
        .getPublicUrl(fileName);

      if (publicUrlData) {
        mediaURLs.push(publicUrlData.publicUrl);
      }
    }

    return mediaURLs;
  } catch (error) {
    console.error("Error in uploadMessageMedia:", error);
    throw error;
  }
};

exports.saveMessageMedia = async (message_id, mediaURLs) => {
  try {
    const mediaEntries = mediaURLs.map((url) => ({
      message_id,
      media_url: url,
    }));

    const { data, error } = await supabase
      .from("messages_media")
      .insert(mediaEntries);

    if (error) {
      console.error("Error saving media URLs:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in saveMessageMedia:", error);
    throw error;
  }
};

exports.removeMessage = async (message_id) => {
  try {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("message_id", message_id);

    return { error: error || null }; // Explicitly return { error: null } if no error
  } catch (error) {
    console.error("Error deleting message", error);
    throw error;
  }
};

exports.deleteMediaFromStorage = async (message_id) => {
  const bucketName = "messages-media";
  const folderPath = `${message_id}/`;

  // List files in the folder to check if they exist
  const { data: files, error: listError } = await supabase.storage
    .from(bucketName)
    .list(folderPath);

  if (listError) {
    console.error(
      `Error listing files in ${bucketName} for message ${message_id}:`,
      listError
    );
    return { error: listError };
  }

  if (!files || files.length === 0) {
    return { error: null }; // No files found; no error
  }

  // Extract file paths to delete
  const filePaths = files.map((file) => `${folderPath}${file.name}`);

  // Attempt to delete the files
  const { error: deleteError } = await supabase.storage
    .from(bucketName)
    .remove(filePaths);

  if (deleteError) {
    console.error(
      `Error deleting files in ${bucketName} for message ${message_id}:`,
      deleteError
    );
  }

  return { error: deleteError || null };
};
