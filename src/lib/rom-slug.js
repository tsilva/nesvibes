export function slugifyRomTitle(title) {
  return String(title ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function getLibraryEntrySlug(entry) {
  return slugifyRomTitle(entry.title) || entry.id;
}
