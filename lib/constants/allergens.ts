// Allergen constants based on the Swift restaurant app
export const ALLERGENS = [
  { label: "Celery", value: "celery" },
  { label: "Cereals Containing Gluten", value: "cereals_containing_gluten" },
  { label: "Crustaceans", value: "crustaceans" },
  { label: "Eggs", value: "eggs" },
  { label: "Fish", value: "fish" },
  { label: "Lupin", value: "lupin" },
  { label: "Milk", value: "milk" },
  { label: "Molluscs", value: "molluscs" },
  { label: "Mustard", value: "mustard" },
  { label: "Peanuts", value: "peanuts" },
  { label: "Sesame Seeds", value: "sesame_seeds" },
  { label: "Soybeans", value: "soybeans" },
  { label: "Sulphur Dioxide", value: "sulphur_dioxide" },
  // { label: "Tree Nuts", value: "tree_nuts" },
  // { label: "Wheat", value: "wheat" },
  // { label: "Barley", value: "barley" },
  // { label: "Rye", value: "rye" },
  // { label: "Oats", value: "oats" },
  // { label: "Corn", value: "corn" },
  // { label: "Gelatin", value: "gelatin" },
  // { label: "Garlic", value: "garlic" },
  // { label: "Onion", value: "onion" },
  // { label: "Alcohol", value: "alcohol" },
  // { label: "Pork", value: "pork" },
  // { label: "Beef", value: "beef" },
  // { label: "Chicken", value: "chicken" },
  // { label: "Lamb", value: "lamb" },
  // { label: "Legumes", value: "legumes" },
  // { label: "Caffeine", value: "caffeine" },
  // { label: "Cocoa", value: "cocoa" },
  // { label: "Colorants", value: "colorants" },
  // { label: "Preservatives", value: "preservatives" },
].sort((a, b) => a.label.localeCompare(b.label));

export const PREP_TIMES = Array.from({ length: 12 }, (_, i) => ({
  label: `${(i + 1) * 5} minutes`,
  value: (i + 1) * 5,
}));

// Dietary filter constants matching the DietaryFilter enum
export const DIETARY_FILTERS = [
  { label: "Vegetarian", value: "vegetarian" },
  // { label: "Non-Vegetarian", value: "nonvegetarian" },
  { label: "Vegan", value: "vegan" },
  // { label: "Gluten-Free", value: "no_gluten" },
  // { label: "Nut-Free", value: "no_nut" },
  // { label: "Dairy-Free", value: "no_dairy" },
  { label: "Halal", value: "halal" },
  { label: "Pescatarian", value: "pescatarian" },
].sort((a, b) => a.label.localeCompare(b.label));
