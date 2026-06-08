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

export function sortKeys(key1, key2) {
  const val1 = key1.key.value;
  const val2 = key2.key.value;
  const idx1 = KeyOrder.indexOf(val1);
  const idx2 = KeyOrder.indexOf(val2);
  if (idx1 === -1 && idx2 === -1) {
    return val1 < val2 ? -1 : val1 > val2 ? 1 : 0;
  }
  if (idx2 === -1) {
    return -1;
  } else if (idx1 === -1) {
    return 1;
  } else {
    return idx1 - idx2;
  }
}
