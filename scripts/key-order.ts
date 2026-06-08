/**
 * To ease updates and reduce arbitrary diffs, we're going to impose the order
 * of the keys in the index.json file.
 *
 * Note: This order needs to be revisited when a new key is created and when a
 * key is removed.
 */
export const KeyOrder = [
  "name",
  "description",
  "description_html",
  "homepage",
  "repository",
  "logo",
  "owner",
  "licenses",
  "status",
  "purposes",
  "categories",
];
