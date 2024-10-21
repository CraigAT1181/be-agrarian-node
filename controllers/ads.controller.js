const {fetchAds, postNewAd, uploadAdMedia, saveAdMedia, removeAd, deleteMediaFromStorage} = require("../models/ads.model")

exports.getAds = async (req, res, next) => {

    const {townId} = req.query;

    try {
        const ads = await fetchAds(townId);
        res.status(200).json(ads);
    } catch (error) {
        next(error);
    }
};

exports.postAd = async (req, res, next) => {
    try {
        const { user_id, town_id, title, content } = req.body;
        const files = req.files;

        const adDetails = { user_id, town_id, title, content };
        const newAd = await postNewAd(adDetails);

        const ad_id = newAd.ad_id;
  
        let mediaURLs = [];
    
        if (files && files.length > 0) {
            mediaURLs = await uploadAdMedia(ad_id, files);
            await saveAdMedia(ad_id, mediaURLs);
        }
    
        res.status(200).json({ ad: newAd, mediaURLs });
    } catch (error) {
        console.error("Error posting new ad:", error);
        next(error);
    }
};

exports.deleteAd = async (req, res, next) => {

    const {ad_id} = req.body;

    if (!ad_id) {
        return res.status(400).json({ error: "ad_id is required" });
      }

      try {

        const { error: adError } = await removeAd(ad_id);

        if (adError) {
          return res.status(500).json({ error: adError.message });
        }
    
          // Delete the media files from Supabase storage by removing the folder named after post_id
const { error: storageError } = await deleteMediaFromStorage(ad_id);

if (storageError) {
    return res.status(500).json({ error: storageError.message });
  }

         return   res.status(204).send();
    
        
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
  };