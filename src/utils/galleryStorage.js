import { db, storage, isFirebaseConfigured } from "../firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { SERVICES } from "../data/beautyData";
import { useState, useEffect } from "react";

const GALLERY_LOCAL_STORAGE_KEY = "dhanvika_gallery_references";

// Helper to get local storage reference data
const getLocalReferences = () => {
  try {
    const data = localStorage.getItem(GALLERY_LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Local storage error:", e);
    return {};
  }
};

// Helper to save local storage reference data
const saveLocalReferences = (data) => {
  try {
    localStorage.setItem(GALLERY_LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Local storage save error:", e);
  }
};

export const DEFAULT_GALLERY_IMAGES = {
  // Hair Cut
  "hc-basic-trim": [
    "https://images.unsplash.com/photo-1595853035070-59a39fe84de3?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-layer-cut": [
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-step-cut": [
    "https://images.unsplash.com/photo-1605497746445-97d1b0a9eaf4?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-bob-cut": [
    "https://images.unsplash.com/photo-1620331311520-246422fd82f9?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-pixie-cut": [
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-feather-cut": [
    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-u-cut": [
    "https://images.unsplash.com/photo-1552046122-03184de85e08?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-v-cut": [
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-butterfly-cut": [
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-kids-cut": [
    "https://images.unsplash.com/photo-1503919005314-30d93d07d823?auto=format&fit=crop&w=800&q=80"
  ],
  
  // Hair Styling
  "hs-blow-dry": [
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80"
  ],
  "hs-straightening": [
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80"
  ],
  "hs-curl": [
    "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=800&q=80"
  ],
  "hs-party": [
    "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=800&q=80"
  ],
  "hs-braided": [
    "https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&w=800&q=80"
  ],
  "hs-bun": [
    "https://images.unsplash.com/photo-1605497746445-97d1b0a9eaf4?auto=format&fit=crop&w=800&q=80"
  ],
  "hs-bridal": [
    "https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&w=800&q=80"
  ],
  "hs-reception": [
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80"
  ],

  // Facial
  "f-cleanup": [
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=800&q=80"
  ],
  "f-fruit": [
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
  ],
  "f-gold": [
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80"
  ],
  "f-diamond": [
    "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=800&q=80"
  ],
  "f-pearl": [
    "https://images.unsplash.com/photo-1552046122-03184de85e08?auto=format&fit=crop&w=800&q=80"
  ],
  "f-anti-aging": [
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=800&q=80"
  ],
  "f-hydrating": [
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80"
  ],
  "f-acne": [
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
  ],

  // Bridal Makeup
  "bm-engagement": [
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80"
  ],
  "bm-hd": [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"
  ],
  "bm-airbrush": [
    "https://images.unsplash.com/photo-1522337249400-d1a591e53480?auto=format&fit=crop&w=800&q=80"
  ],
  "bm-reception": [
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80"
  ],
  "bm-party": [
    "https://images.unsplash.com/photo-1522337249400-d1a591e53480?auto=format&fit=crop&w=800&q=80"
  ],
  "bm-traditional": [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"
  ],

  // Manicure
  "m-basic": [
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80"
  ],
  "m-french": [
    "https://images.unsplash.com/photo-1632345031435-8797b2d58045?auto=format&fit=crop&w=800&q=80"
  ],
  "m-gel": [
    "https://images.unsplash.com/photo-1604654894910-ee1d0ef1886a?auto=format&fit=crop&w=800&q=80"
  ],
  "m-spa": [
    "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=800&q=80"
  ],
  "m-nailart": [
    "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80"
  ],

  // Pedicure
  "p-basic": [
    "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=800&q=80"
  ],
  "p-spa": [
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"
  ],
  "p-gel": [
    "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=800&q=80"
  ],
  "p-luxury": [
    "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=800&q=80"
  ],
  "p-foottherapy": [
    "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=800&q=80"
  ],

  // Waxing
  "w-full-arms": [
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=800&q=80"
  ],
  "w-half-arms": [
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80"
  ],
  "w-full-legs": [
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80"
  ],
  "w-half-legs": [
    "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80"
  ],
  "w-underarms": [
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=800&q=80"
  ],
  "w-face": [
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
  ],
  "w-full-body": [
    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80"
  ],

  // Threading
  "t-eyebrow": [
    "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80"
  ],
  "t-upperlip": [
    "https://images.unsplash.com/photo-1522337249400-d1a591e53480?auto=format&fit=crop&w=800&q=80"
  ],
  "t-forehead": [
    "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80"
  ],
  "t-chin": [
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=800&q=80"
  ],
  "t-fullface": [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"
  ],

  // Spa
  "s-head": [
    "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=800&q=80"
  ],
  "s-hair": [
    "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=800&q=80"
  ],
  "s-foot": [
    "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=800&q=80"
  ],
  "s-body": [
    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80"
  ],
  "s-aroma": [
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"
  ],
  "s-relaxation": [
    "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=800&q=80"
  ],

  // Hair Coloring
  "hc-root": [
    "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-global": [
    "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-highlights": [
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-balayage": [
    "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-ombre": [
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-fashion": [
    "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=800&q=80"
  ],
  "hc-gloss": [
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80"
  ],

  // Hair Treatments
  "ht-keratin": [
    "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=800&q=80"
  ],
  "ht-smoothening": [
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80"
  ],
  "ht-rebonding": [
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80"
  ],
  "ht-botox": [
    "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=800&q=80"
  ],
  "ht-dandruff": [
    "https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=800&q=80"
  ],

  // Makeup Services
  "ms-party": [
    "https://images.unsplash.com/photo-1522337249400-d1a591e53480?auto=format&fit=crop&w=800&q=80"
  ],
  "ms-hd": [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"
  ],
  "ms-airbrush": [
    "https://images.unsplash.com/photo-1522337249400-d1a591e53480?auto=format&fit=crop&w=800&q=80"
  ],
  "ms-engagement": [
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80"
  ],

  // Eye Services
  "es-eyelash": [
    "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80"
  ],
  "es-lashlift": [
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80"
  ],
  "es-tinting": [
    "https://images.unsplash.com/photo-1522337249400-d1a591e53480?auto=format&fit=crop&w=800&q=80"
  ],
  "es-lamination": [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"
  ]
};

export const DEFAULT_CATEGORY_IMAGES = {
  "hair-cut": ["https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80"],
  "hair-styling": ["https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&w=800&q=80"],
  "facial": ["https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"],
  "bridal-makeup": ["https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80"],
  "manicure": ["https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80"],
  "pedicure": ["https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=800&q=80"],
  "waxing": ["https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=800&q=80"],
  "threading": ["https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80"],
  "spa": ["https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80"],
  "hair-coloring": ["https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=800&q=80"],
  "hair-treatments": ["https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?auto=format&fit=crop&w=800&q=80"],
  "makeup-services": ["https://images.unsplash.com/photo-1522337249400-d1a591e53480?auto=format&fit=crop&w=800&q=80"],
  "eye-services": ["https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=800&q=80"]
};

// Optimizes image URLs by using Unsplash size params if available
export const getThumbnailUrl = (url) => {
  if (url && url.includes("unsplash.com")) {
    return url.replace(/w=\d+/, "w=150").replace(/q=\d+/, "q=60");
  }
  return url;
};

// Fetches the reference image URLs for a specific service
export const fetchServiceReferences = async (serviceId) => {
  let urls = [];
  
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, "service_references", serviceId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().images) {
        urls = docSnap.data().images;
      }
    } catch (e) {
      console.error("Error fetching from Firestore, falling back to local storage:", e);
      const localData = getLocalReferences();
      urls = localData[serviceId] || [];
    }
  } else {
    const localData = getLocalReferences();
    urls = localData[serviceId] || [];
  }

  // If no custom images are found, fall back to defaults
  if (urls.length === 0) {
    const defaults = DEFAULT_GALLERY_IMAGES[serviceId];
    if (defaults && defaults.length > 0) {
      return defaults;
    }
    // Fallback to category defaults
    const serviceObj = SERVICES.find((s) => s.id === serviceId);
    if (serviceObj) {
      const catName = serviceObj.category;
      const catKey = Object.keys(DEFAULT_CATEGORY_IMAGES).find(key => {
        return key.replace("-", " ").toLowerCase() === catName.toLowerCase();
      });
      if (catKey && DEFAULT_CATEGORY_IMAGES[catKey]) {
        return DEFAULT_CATEGORY_IMAGES[catKey];
      }
    }
    // Absolute fallback
    return ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80"];
  }

  return urls;
};

// Uploads a image file to Firebase Storage or falls back to public hosting
export const uploadReferenceImage = async (serviceId, file) => {
  if (isFirebaseConfigured) {
    const filename = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `service_references/${serviceId}/${filename}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } else {
    // Fallback: upload file to file.io temporarily for dev mode
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("https://file.io", {
      method: "POST",
      body: formData
    });
    if (!response.ok) throw new Error("Upload failed on dev host file.io");
    const resData = await response.json();
    if (resData.success && resData.link) {
      return resData.link;
    }
    throw new Error("Upload response did not return a valid link");
  }
};

// Adds a reference image URL to Firestore / local storage
export const addReferenceImageUrl = async (serviceId, url) => {
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, "service_references", serviceId);
      const docSnap = await getDoc(docRef);
      let currentImages = [];
      if (docSnap.exists() && docSnap.data().images) {
        currentImages = docSnap.data().images;
      }
      const updatedImages = [...currentImages, url];
      await setDoc(docRef, { images: updatedImages }, { merge: true });
    } catch (e) {
      console.error("Error writing to Firestore:", e);
      const localData = getLocalReferences();
      localData[serviceId] = [...(localData[serviceId] || []), url];
      saveLocalReferences(localData);
    }
  } else {
    const localData = getLocalReferences();
    localData[serviceId] = [...(localData[serviceId] || []), url];
    saveLocalReferences(localData);
  }
};

// Deletes a reference image URL from Firestore / local storage
export const deleteReferenceImageUrl = async (serviceId, url) => {
  if (isFirebaseConfigured) {
    try {
      // First try to delete from Firebase Storage if it's a Storage URL
      if (url.includes("firebasestorage.googleapis.com")) {
        try {
          const storageRef = ref(storage, url);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn("Storage deletion failed or file not found:", storageErr);
        }
      }

      const docRef = doc(db, "service_references", serviceId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().images) {
        const updatedImages = docSnap.data().images.filter((img) => img !== url);
        await setDoc(docRef, { images: updatedImages }, { merge: true });
      }
    } catch (e) {
      console.error("Error deleting from Firestore:", e);
      const localData = getLocalReferences();
      if (localData[serviceId]) {
        localData[serviceId] = localData[serviceId].filter((img) => img !== url);
        saveLocalReferences(localData);
      }
    }
  } else {
    const localData = getLocalReferences();
    if (localData[serviceId]) {
      localData[serviceId] = localData[serviceId].filter((img) => img !== url);
      saveLocalReferences(localData);
    }
  }
};

// Saves reference images directly for a service (replaces old ones)
export const saveServiceReferences = async (serviceId, images) => {
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, "service_references", serviceId);
      await setDoc(docRef, { images }, { merge: true });
    } catch (e) {
      console.error("Error saving references to Firestore:", e);
      const localData = getLocalReferences();
      localData[serviceId] = images;
      saveLocalReferences(localData);
    }
  } else {
    const localData = getLocalReferences();
    localData[serviceId] = images;
    saveLocalReferences(localData);
  }
};

// Synchronous default image getter for fallback/initial paint
export const getServiceDefaultImage = (serviceId) => {
  const defaults = DEFAULT_GALLERY_IMAGES[serviceId];
  if (defaults && defaults.length > 0) {
    return defaults[0];
  }
  const serviceObj = SERVICES.find((s) => s.id === serviceId);
  if (serviceObj) {
    const catName = serviceObj.category;
    const catKey = Object.keys(DEFAULT_CATEGORY_IMAGES).find(key => {
      return key.replace("-", " ").toLowerCase() === catName.toLowerCase();
    });
    if (catKey && DEFAULT_CATEGORY_IMAGES[catKey]) {
      return DEFAULT_CATEGORY_IMAGES[catKey][0];
    }
  }
  return "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80";
};

// Custom React hook to dynamically resolve first reference image for a service
export function useServiceImage(serviceId) {
  const [imageUrl, setImageUrl] = useState(() => getServiceDefaultImage(serviceId));

  useEffect(() => {
    let active = true;
    const loadImage = async () => {
      try {
        const urls = await fetchServiceReferences(serviceId);
        if (active && urls && urls.length > 0) {
          setImageUrl(urls[0]);
        }
      } catch (err) {
        console.error("Failed to load dynamic service image:", err);
      }
    };
    loadImage();
    return () => {
      active = false;
    };
  }, [serviceId]);

  return imageUrl;
}
