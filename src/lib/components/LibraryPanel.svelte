<script>
  export let activeLibraryId = "";
  export let isBundledPermalinkActive = false;
  export let libraryEntries = [];
  export let libraryStatusMessages = [];
  export let onLoadLocalRom = () => {};
  export let onNavigateToEntry = () => {};
  export let selectedLibraryEntry = null;
</script>

<aside class="side-rail" aria-label="Setup notes">
  <article class="launcher-shell" aria-label="Bundled ROM library">
    <div class="launcher-header">
      <h2>ROM Library</h2>
    </div>
    <div class="launcher-scroll">
      {#if libraryStatusMessages.length > 0}
        <div class="launcher-status-stack" aria-live="polite">
          {#each libraryStatusMessages as message (`status-${message}`)}
            <p class="launcher-empty">{message}</p>
          {/each}
        </div>
      {/if}

      {#if selectedLibraryEntry}
        <div class="launcher-details" aria-live="polite">
          <p class="launcher-details-title">{selectedLibraryEntry.title}</p>
          {#if selectedLibraryEntry.authorCredit}
            <p class="launcher-details-credit">
              <span>By</span>
              {#if selectedLibraryEntry.authorCredit.url}
                <a href={selectedLibraryEntry.authorCredit.url} target="_blank" rel="noreferrer">{selectedLibraryEntry.authorCredit.name}</a>
              {:else}
                <span>{selectedLibraryEntry.authorCredit.name}</span>
              {/if}
            </p>
          {/if}

          <div class="launcher-link-row">
            {#each selectedLibraryEntry.detailLinks as link (`${selectedLibraryEntry.id}-${link.label}`)}
              <a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
            {/each}
          </div>
        </div>
      {/if}

      {#if libraryEntries.length > 0}
        <ul class="launcher-grid" aria-label="Bundled ROM list">
          {#if isBundledPermalinkActive}
            <li class="launcher-list-item">
              <button
                type="button"
                class="launcher-item launcher-item-local"
                on:click={() => void onLoadLocalRom()}
              >
                <strong>Load your own ROM</strong>
              </button>
            </li>
          {/if}
          {#each libraryEntries as entry (entry.id)}
            <li class="launcher-list-item">
              <a
                href={entry.playPath}
                class={`launcher-item ${entry.id === activeLibraryId ? "active" : ""} ${entry.supported ? "" : "unsupported"}`.trim()}
                aria-current={entry.id === activeLibraryId ? "page" : undefined}
                aria-disabled={!entry.supported}
                title={entry.supported
                  ? `${entry.title} • Mapper ${entry.mapper} • ${entry.licenseSummary}`
                  : `${entry.title} is unavailable in this build (mapper ${entry.mapper})`}
                data-sveltekit-preload-data="tap"
                on:click|preventDefault={() => void onNavigateToEntry(entry)}
              >
                <strong>{entry.title}</strong>
              </a>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="launcher-empty">No bundled ROMs available.</p>
      {/if}
    </div>
  </article>
</aside>
