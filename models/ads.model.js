const supabase = require("../config/supabase");

exports.fetchAds = async (town_id) => {
    let query = supabase
      .from("ads")
      .select(
        `
          *,
          users (
            profile_pic,
            user_name,
            allotments (
              allotment_name
            )
          ),
          ads_media (
            media_url
          )
        `
      )
      .order("created_at", { ascending: false });
  
    // Only apply the town_id filter if it's provided
    if (town_id) {
      query = query.eq("town_id", town_id);
    }
  
    const { data, error } = await query;
  
    if (error) {
      console.error("Error fetching ads from database:", error);
      throw error;
    }
  console.log("Returned from model:", data);
    return data;
  };
  
  exports.postNewAd = async (adDetails) => {
    const { user_id, town_id, title, content } = adDetails;
  
      const { data, error } = await supabase
        .from("ads")
        .insert([
          {
            user_id,
            town_id,
            title,
            content
          },
        ])
        .select("*");
  
      if (error) {
        console.error("Error posting new ad:", error);
        throw error;
      }
  
      return data[0];
    
  };

  exports.uploadAdMedia = async (ad_id, files) => {
    let mediaURLs = [];
  
    for (const file of files) {
      const fileName = `${ad_id}/${Date.now()}_${file.originalname}`;
  
      // Upload the file to Supabase storage
      const { data, error } = await supabase.storage
        .from("ads-media")
        .upload(fileName, file.buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.mimetype,
        });
  
      if (error) {
        console.error("Error uploading media file:", error);
        throw error;
      }
  
      // Get the public URL of the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("ads-media")
        .getPublicUrl(fileName);
  
      if (publicUrlData?.publicUrl) {
        mediaURLs.push(publicUrlData.publicUrl);
      } else {
        console.error("Error retrieving media URL for:", fileName);
        throw new Error(`Unable to retrieve public URL for file: ${fileName}`);
      }
    }
    return mediaURLs;
  };
  

  exports.saveAdMedia = async (ad_id, mediaURLs) => {
    try {
      const mediaEntries = mediaURLs.map((url) => ({
        ad_id,
        media_url: url,
      }));
      
  
      const { data, error } = await supabase
        .from("ads_media")
        .insert(mediaEntries);
  
      if (error) {
        console.error("Error saving media URLs:", error);
        throw error;
      }
  
      return data;
    } catch (error) {
      console.error("Error in saveAdMedia:", error);
      throw error;
    }
  };

  exports.removeAd = async (ad_id) => {
    try {
        const { error } = await supabase
        .from('ads')
        .delete()
        .eq('ad_id', ad_id);

        return { error };
    } catch (error) {
        console.error("Error deleting ad", error);
        throw error;
    }
  };

  exports.deleteMediaFromStorage = async (ad_id) => {
    const bucketName = 'ads-media';
    const folderPath = `${ad_id}/`;
  
    const { data: files, error: listError } = await supabase
      .storage
      .from(bucketName)
      .list(folderPath);
  
    if (listError) {
      console.error("Error listing files:", listError);
      return { error: listError };
    }
  
    if (!files || files.length === 0) {
      console.log("No files found to delete in folder:", folderPath);   
      return { error: null };  // No files to delete
    }
  
    // Extract file paths to delete
    const filePaths = files.map(file => `${folderPath}${file.name}`);
  
    // Attempt to delete the files
    const { error: deleteError } = await supabase
      .storage
      .from(bucketName)
      .remove(filePaths);
  
    if (deleteError) {
      console.error("Error deleting files:", deleteError);
    }
  
    return { error: deleteError };
  };