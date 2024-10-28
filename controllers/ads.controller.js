const {
    fetchAds,
    postNewAd,
    uploadAdMedia,
    saveAdMedia,
    removeAd,
    deleteMediaFromStorage
} = require("../models/ads.model");

// Get ads by townId
exports.getAds = async (req, res, next) => {
    const { townId } = req.query;

    try {
        const ads = await fetchAds(townId);
        res.status(200).json(ads);
    } catch (error) {
        console.error("Error retrieving ads:", error);
        next(error);
    }
};

// Post a new ad with optional media upload
exports.postAd = async (req, res, next) => {
    const { user_id, town_id, title, content } = req.body;
    const files = req.files;

    try {
        // Create a new ad with provided details
        const adDetails = { user_id, town_id, title, content };
        const newAd = await postNewAd(adDetails);

        const ad_id = newAd.ad_id;
        let mediaURLs = [];

        // If files are uploaded, upload and save media URLs
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

// Delete an ad and its associated media from storage
exports.deleteAd = async (req, res, next) => {
    const { ad_id } = req.body;

    if (!ad_id) {
        return res.status(400).json({ error: "ad_id is required" });
    }

    try {
        // Remove the ad entry from the database
        const { error: adError } = await removeAd(ad_id);
        if (adError) {
            console.error("Error removing ad:", adError.message);
            return res.status(500).json({ error: adError.message });
        }

        // Delete associated media from storage
        const { error: storageError } = await deleteMediaFromStorage(ad_id);
        if (storageError) {
            console.error("Error deleting media from storage:", storageError.message);
            return res.status(500).json({ error: storageError.message });
        }

        res.status(204).send(); // Successfully deleted
    } catch (error) {
        console.error("Error deleting ad:", error);
        res.status(500).json({ error: error.message });
    }
};
