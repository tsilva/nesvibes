import { error } from "@sveltejs/kit";
import { getLibraryEntryBySlug, getLibraryRouteEntries, loadNesVibesPageData } from "$lib/server/library.js";

export const prerender = true;

export async function entries() {
  return getLibraryRouteEntries();
}

export async function load({ params }) {
  const selectedGame = await getLibraryEntryBySlug(params.slug);

  if (!selectedGame) {
    throw error(404, "Game not found.");
  }

  return loadNesVibesPageData(selectedGame.id);
}
