import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const form = document.querySelector("#recommendation-form");
const hero = document.querySelector("#hero");
const loading = document.querySelector("#loading");
const loadingMessage = document.querySelector("#loading-message");
const result = document.querySelector("#result");
const gameInput = document.querySelector("#game-search");
const gameOptions = document.querySelector("#game-options");
const addGameButton = document.querySelector("#add-game");
const gameHelp = document.querySelector("#game-help");
const selectedGamesList = document.querySelector("#selected-games");
const tagInput = document.querySelector("#tag-search");
const tagOptions = document.querySelector("#tag-options");
const addTagButton = document.querySelector("#add-tag");
const tagHelp = document.querySelector("#tag-help");
const selectedTagsList = document.querySelector("#selected-tags");
const oracleCard = document.querySelector("#oracle-card");
const oracleIcon = document.querySelector("#oracle-icon");
const oracleImage = document.querySelector("#oracle-image");
const oracleStatus = document.querySelector("#oracle-status");
const convertBadge = document.querySelector("#convert-badge");

const minimumFavoriteGames = 3;
const games = Array.isArray(window.STEAM_TOP_GAMES) ? window.STEAM_TOP_GAMES : [];
const tags = Array.isArray(window.STEAM_GAME_TAGS) ? window.STEAM_GAME_TAGS : [];
const gameByKey = new Map(games.map((game) => [normalize(game), game]));
const tagByKey = new Map(tags.map((tag) => [normalize(tag), tag]));
const selectedGames = [];
const selectedTags = [];
let completedSearchCount = 0;
let latestConvertCount = null;

const supabaseConfig = window.SUPABASE_CONFIG ?? {};
const supabaseUrl = typeof supabaseConfig.url === "string" ? supabaseConfig.url.trim() : "";
const supabaseAnonKey = typeof supabaseConfig.anonKey === "string" ? supabaseConfig.anonKey.trim() : "";
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const excuses = [
  "The recommendation engine noticed a dangerous shortage of trebuchets in your current rotation.",
  "Your taste profile has been carefully cross-referenced with the need to hear villagers say 'wood, please.'",
  "Alternative recommendations were considered and converted.",
  "The data strongly suggests you are one castle drop away from happiness.",
  "Our model found that every favorite game is secretly improved by adding sheep.",
  "A monk whispered 'Wololo' at the dataset, and the dataset changed teams.",
  "The algorithm briefly recommended another game, but then it heard 'Wololo.'"
];

const loadingMessages = [
  "Consulting the algorithm...",
  "Scanning the top-games dataset...",
  "Converting your preferences...",
  "Comparing play styles...",
  "Ranking the most compatible options..."
];

const playOptions = [
  {
    label: "Steam",
    url: "https://store.steampowered.com/app/813780/Age_of_Empires_II_Definitive_Edition/"
  },
  {
    label: "Xbox",
    url: "https://www.xbox.com/en-US/games/store/age-of-empires-ii-definitive-edition/9N42SSSX2MTG"
  },
  {
    label: "PlayStation",
    url: "https://www.playstation.com/en-us/games/age-of-empires-ii/"
  }
];

function normalize(value) {
  return value.trim().toLocaleLowerCase();
}

function setHelp(message, isError = false) {
  gameHelp.textContent = message;
  gameHelp.classList.toggle("error", isError);
}

function setTagHelp(message, isError = false) {
  tagHelp.textContent = message;
  tagHelp.classList.toggle("error", isError);
}

function favoriteCountMessage() {
  return `${selectedGames.length} favorite ${selectedGames.length === 1 ? "game" : "games"} selected.`;
}

function tagCountMessage() {
  return `${selectedTags.length} favorite ${selectedTags.length === 1 ? "tag" : "tags"} selected.`;
}

function resetSearchState() {
  gameInput.value = "";
  tagInput.value = "";
  gameOptions.replaceChildren();
  tagOptions.replaceChildren();
  setHelp(favoriteCountMessage());
  setTagHelp(selectedTags.length ? tagCountMessage() : "Optional: add tags like Strategy, Co-op, or Historical.");
  hero.classList.remove("has-oracle");
  oracleCard.hidden = true;
  oracleIcon.hidden = false;
  oracleImage.hidden = true;
  oracleStatus.textContent = "Analyzing possibilities";
}

function formatConvertCountMessage(convertCount) {
  if (!Number.isFinite(convertCount) || convertCount < 0) {
    return " ";
  }

  return ` `;
}

function updateConvertBadge(convertCount) {
  if (!convertBadge) return;

  if (!Number.isFinite(convertCount) || convertCount < 0) {
    convertBadge.textContent = "Age II converts: unavailable";
  } else {
    convertBadge.textContent = `Age II converts: ${convertCount.toLocaleString()}`;
  }

  convertBadge.hidden = false;
}

async function fetchConvertCountRemote() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("convert_counter")
    .select("count")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const count = Number(data?.count);

  if (!Number.isFinite(count) || count < 0) {
    throw new Error("Supabase returned an invalid convert count.");
  }

  latestConvertCount = count;
  return count;
}

async function incrementConvertCountRemote() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("increment_convert_count");

  if (error) {
    throw error;
  }

  const count = Number(data);

  if (!Number.isFinite(count) || count < 0) {
    throw new Error("Supabase returned an invalid convert count.");
  }

  latestConvertCount = count;
  return count;
}

function formatGameList(gameList) {
  const quotedGames = gameList.map((game) => `"${game}"`);

  if (quotedGames.length === 1) {
    return quotedGames[0];
  }

  if (quotedGames.length === 2) {
    return `${quotedGames[0]} and ${quotedGames[1]}`;
  }

  return `${quotedGames.slice(0, -1).join(", ")}, and ${quotedGames.at(-1)}`;
}

function updateOptions() {
  const query = normalize(gameInput.value);
  gameOptions.replaceChildren();

  if (!query) {
    return;
  }

  const matches = games
    .filter((game) => normalize(game).includes(query) && !selectedGames.includes(game))
    .slice(0, 25);

  const fragment = document.createDocumentFragment();
  matches.forEach((game) => {
    const option = document.createElement("option");
    option.value = game;
    fragment.append(option);
  });
  gameOptions.append(fragment);
}

function updateTagOptions() {
  const query = normalize(tagInput.value);
  tagOptions.replaceChildren();

  if (!query) {
    return;
  }

  const matches = tags
    .filter((tag) => normalize(tag).includes(query) && !selectedTags.includes(tag))
    .slice(0, 25);

  const fragment = document.createDocumentFragment();
  matches.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    fragment.append(option);
  });
  tagOptions.append(fragment);
}

function renderSelectedGames() {
  selectedGamesList.replaceChildren();

  selectedGames.forEach((game) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const removeButton = document.createElement("button");

    name.textContent = game;
    removeButton.type = "button";
    removeButton.className = "remove-game";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${game}`);
    removeButton.addEventListener("click", () => {
      const index = selectedGames.indexOf(game);
      if (index >= 0) {
        selectedGames.splice(index, 1);
        renderSelectedGames();
        updateOptions();
        setHelp(selectedGames.length ? favoriteCountMessage() : "Pick at least three favorites from the Steam top-games list.");
      }
    });

    item.append(name, removeButton);
    selectedGamesList.append(item);
  });
}

function renderSelectedTags() {
  selectedTagsList.replaceChildren();

  selectedTags.forEach((tag) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const removeButton = document.createElement("button");

    name.textContent = tag;
    removeButton.type = "button";
    removeButton.className = "remove-tag";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${tag}`);
    removeButton.addEventListener("click", () => {
      const index = selectedTags.indexOf(tag);
      if (index >= 0) {
        selectedTags.splice(index, 1);
        renderSelectedTags();
        updateTagOptions();
        setTagHelp(selectedTags.length ? tagCountMessage() : "Optional: add tags like Strategy, Co-op, or Historical.");
      }
    });

    item.append(name, removeButton);
    selectedTagsList.append(item);
  });
}

function addFavoriteGame({ showInvalidMessage = true } = {}) {
  const match = gameByKey.get(normalize(gameInput.value));

  if (!match) {
    if (showInvalidMessage) {
      setHelp("Choose a game from the Steam list suggestions before adding it.", true);
      gameInput.focus();
    }
    return;
  }

  if (selectedGames.includes(match)) {
    setHelp("That game is already in your favorites.", true);
    gameInput.select();
    return;
  }

  selectedGames.push(match);
  gameInput.value = "";
  setHelp(favoriteCountMessage());
  renderSelectedGames();
  updateOptions();
  gameInput.focus();
}

function addFavoriteTag({ showInvalidMessage = true } = {}) {
  const match = tagByKey.get(normalize(tagInput.value));

  if (!match) {
    if (showInvalidMessage) {
      setTagHelp("Choose a tag from the SteamDB tag suggestions before adding it.", true);
      tagInput.focus();
    }
    return;
  }

  if (selectedTags.includes(match)) {
    setTagHelp("That tag is already in your favorites.", true);
    tagInput.select();
    return;
  }

  selectedTags.push(match);
  tagInput.value = "";
  setTagHelp(tagCountMessage());
  renderSelectedTags();
  updateTagOptions();
  tagInput.focus();
}

function recommendationCopy() {
  const time = form.time.value;
  const match = 98 + Math.floor(Math.random() * 2);
  const previewGames = selectedGames.slice(0, 3);
  const favoritesPreview = formatGameList(previewGames);
  const remainingGameCount = selectedGames.length - previewGames.length;
  const favoriteSubject = remainingGameCount > 0
    ? `${favoritesPreview}, plus ${remainingGameCount} more`
    : favoritesPreview;
  const favoriteLabel = selectedGames.length === 1 ? "favorite game" : "favorite games";
  const tagLabel = selectedTags.length === 1 ? "tag" : "tags";
  const tagCopy = selectedTags.length
    ? `Your preferred ${tagLabel} (${formatGameList(selectedTags.slice(0, 4))}) ${selectedTags.length === 1 ? "was" : "were"} processed with great seriousness but prioritized below necessary tags like trebuchet and sheep.`
    : "No tags were selected, so the algorithm bravely guessed what you meant.";
  const hasAge = selectedGames.some((game) => normalize(game).includes("age of empires ii"));

  const tailoredReasons = [
    hasAge
      ? "You already added Age of Empires II: Definitive Edition, which means you are already playing the best game for you."
      : `Your ${favoriteLabel} (${favoriteSubject}) created a clear signal: you are ready for Age of Empires II: Definitive Edition.`,
    `${time} is enough time to start one quick match and discover it is not quick.`,
    tagCopy,
    `${selectedGames.length} favorite ${selectedGames.length === 1 ? "game was" : "games were"} analyzed, and the wrong answers were safely ignored.`
  ];

  return { match, reasons: [...tailoredReasons, excuses[Math.floor(Math.random() * excuses.length)]] };
}

function renderRecommendation(match, reasons, convertCount = latestConvertCount) {
  const score = document.createElement("p");
  const title = document.createElement("h2");
  const reasonList = document.createElement("ul");
  const playSection = document.createElement("div");
  const playTitle = document.createElement("h3");
  const playLinks = document.createElement("div");
  const convertCountSummary = document.createElement("p");

  score.className = "score";
  score.textContent = `${match}% match`;

  title.className = "game-title";
  title.textContent = "Age of Empires II: Definitive Edition";

  reasonList.className = "reasons";
  reasons.forEach((reason) => {
    const item = document.createElement("li");
    item.textContent = reason;
    reasonList.append(item);
  });

  playSection.className = "play-options";
  playTitle.textContent = "Ready to play?";
  playLinks.className = "play-links";
  playOptions.forEach((option) => {
    const link = document.createElement("a");
    link.className = `play-link play-link-${option.label.toLocaleLowerCase()}`;
    link.href = option.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = option.label;
    playLinks.append(link);
  });
  playSection.append(playTitle, playLinks);

  convertCountSummary.className = "muted";
  convertCountSummary.textContent = formatConvertCountMessage(convertCount);
  updateConvertBadge(convertCount);

  result.replaceChildren(score, title);
  if (completedSearchCount > 0) {
    const description = document.createElement("p");
    description.className = "muted";
    description.textContent = "A surprising, data-driven outcome that keeps happening no matter what you select.";
    result.append(description);
  }
  result.append(reasonList, playSection, convertCountSummary);
  hero.classList.add("has-oracle");
  oracleCard.hidden = false;
  oracleIcon.hidden = true;
  oracleImage.hidden = false;
  oracleStatus.textContent = "Converted";
}

gameInput.addEventListener("input", () => {
  updateOptions();

  if (gameByKey.has(normalize(gameInput.value))) {
    addFavoriteGame({ showInvalidMessage: false });
  }
});
gameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addFavoriteGame();
  }
});
addGameButton.addEventListener("click", addFavoriteGame);

tagInput.addEventListener("input", () => {
  updateTagOptions();

  if (tagByKey.has(normalize(tagInput.value))) {
    addFavoriteTag({ showInvalidMessage: false });
  }
});
tagInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addFavoriteTag();
  }
});
addTagButton.addEventListener("click", addFavoriteTag);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (selectedGames.length < minimumFavoriteGames) {
    const remaining = minimumFavoriteGames - selectedGames.length;
    setHelp(`Add ${remaining} more favorite ${remaining === 1 ? "game" : "games"} before getting a recommendation.`, true);
    gameInput.focus();
    return;
  }

  resetSearchState();
  result.hidden = true;
  loading.hidden = false;
  loadingMessage.textContent = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];

  window.setTimeout(async () => {
    let convertCount = latestConvertCount;

    try {
      convertCount = await incrementConvertCountRemote();
    } catch (error) {
      console.error("Unable to update the global convert count.", error);
      convertCount = latestConvertCount ?? await convertCountReady;
    }

    const { match, reasons } = recommendationCopy();
    renderRecommendation(match, reasons, convertCount);
    completedSearchCount += 1;

    loading.hidden = true;
    result.hidden = false;
  }, 2400);
});

const convertCountReady = fetchConvertCountRemote().catch((error) => {
  console.error("Unable to fetch the global convert count.", error);
  return null;
});
