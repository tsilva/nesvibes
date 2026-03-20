import { loadNesVibesPageData } from "$lib/server/library.js";

export async function load() {
  return loadNesVibesPageData();
}
