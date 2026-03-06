document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://supreme-admin-worker.neonasmin.workers.dev";
const select = document.getElementById("animeSelect");
const searchInput = document.getElementById("searchInput");
const updateBtn = document.getElementById("updateBtn");
const bannerImage = document.getElementById("bannerImage");
const TOKEN_API = `${API_BASE}/admin/token`;
const tokenDisplay = document.getElementById("currentToken");
const tokenInput = document.getElementById("tokenInput");
const applyTokenBtn = document.getElementById("applyTokenBtn");
let currentToken = null;
const episodesContainer = document.getElementById("episodesContainer");
const CACHE_API = `${API_BASE}/admin/cache`;
let cacheTimer = null;
let currentId = null;
let episodes = [];
const searchBtn = document.getElementById("searchBtn");
async function saveProgressNow(){

if(!currentId){
alert("No anime selected");
return;
}

const animeInfo = {};

animeInfo.image_url = document.getElementById("image_url").value || "";

document.querySelectorAll("#animeInfoFields input, #animeInfoFields textarea")
.forEach(field => {

let val = field.value;

const arrayFields = [
"tags","title_synonyms","studios","dubbed_languages",
"producers","licensors","themes","demographics"
];

if(arrayFields.includes(field.dataset.field)){
animeInfo[field.dataset.field] =
val.split(",").map(s=>s.trim()).filter(Boolean);
}else{
animeInfo[field.dataset.field] = val;
}

});

try{

await fetch(`${CACHE_API}/${currentId}`,{
method:"POST",
headers:{ "Content-Type":"application/json"},
body:JSON.stringify({
anime_info:animeInfo,
streaming_links:episodes
})
});

const tokenRes = await fetch(`${TOKEN_API}/${currentId}`,{
method:"POST"
});

const tokenData = await tokenRes.json();

currentToken = tokenData.token;
tokenDisplay.textContent = currentToken;

const status = document.getElementById("draftStatus");
status.style.display="block";
status.textContent="● Progress Saved";

}catch(err){

alert("Save failed");

}

}
async function performSearch() {

  const query = searchInput.value.trim();

  if (query.length < 2) {
    select.innerHTML = "";
    return;
  }

  try {

    const res = await fetch(
      `${API_BASE}/admin/search?q=${encodeURIComponent(query)}`
    );

    const result = await res.json();
    const rows = result.data || [];

    select.innerHTML = "";

    rows.forEach(row => {
      const opt = document.createElement("option");
      opt.value = row.id;
      opt.textContent = `${row.title} (${row.year || "?"})`;
      select.appendChild(opt);
    });

  } catch (err) {
    console.error("Search failed", err);
  }
}

/* Attach listeners OUTSIDE */

searchBtn.addEventListener("click", performSearch);

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    performSearch();
  }
});
const imageInput = document.getElementById("image_url");
if (imageInput) {
  imageInput.addEventListener("input", () => {
    bannerImage.src = imageInput.value;
    if (currentId) {
      
    }
  });
}
/* ===================== LOAD IDS ===================== */

applyTokenBtn.onclick = async ()=>{

const token = tokenInput.value.trim();

if(!token){
alert("Enter token");
return;
}

try{

const res = await fetch(`${TOKEN_API}/${token}`);

if(!res.ok){
alert("Invalid token");
return;
}

const data = await res.json();

currentId = data.id;

loadAnimeInfo(data.anime_info);
loadEpisodes(data.streaming_links);

tokenDisplay.textContent = token;

alert("Progress loaded");

}catch(err){

alert("Invalid token");

}

};
function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}
/* ===================== LOAD ANIME ===================== */

select.addEventListener("change", async () => {
  currentId = select.value;
  localStorage.setItem("admin_last_id", currentId);

  if (!currentId) return;

  const localDraft = localStorage.getItem("admin_draft_" + currentId);

  if (localDraft) {
    const draft = JSON.parse(localDraft);
    loadAnimeInfo(draft.anime_info);
    loadEpisodes(draft.streaming_links || []);
    console.log("Loaded from LOCAL draft");
    return;
  }

  try {
    // Fetch server cache
    const cacheRes = await fetch(`${CACHE_API}/${currentId}`);
    const cache = await cacheRes.json();

    if (cache && cache.data) {
      loadAnimeInfo(cache.data.anime_info);
      loadEpisodes(cache.data.streaming_links || []);
      console.log("Loaded from SERVER cache");
      return;
    }

    // Fetch main data
    const animeRes = await fetch(`${API_BASE}/admin/anime/${currentId}`);
    const data = await animeRes.json();

    loadAnimeInfo(data.anime_info);
    loadEpisodes(data.streaming_links || []);

  } catch (err) {
    console.error("Failed loading anime:", err);
  }
});

/* ===================== ANIME INFO ===================== */
const ALL_FIELDS = [
  "type",
  "title",
  "title_japanese",
  "title_synonyms",
  "mal_id",
  "year",
  "season",
  "studio",
  "studios",
  "audio",
  "dubbed_languages",
  "duration",
  "episodes",
  "tags",
  "age_rating",
  "total_seasons",
  "airing_date",
  "ended_date",
  "airing_status",
  "overview",
  "producers",
  "licensors",
  "themes",
  "demographics",
  "trailer",
  "source",
  "popularity",
  "rating",
  "rank",
  "top_genre_rank",
  "scored_by",
  "members",
  "favorites"
];

const numberFields = [
  "mal_id", "year", "episodes", "total_seasons",
  "popularity", "rank", "scored_by",
  "members", "favorites"
];

const textareaFields = [
  "overview", "tags", "title_synonyms",
  "studios", "dubbed_languages",
  "producers", "licensors", "themes", "demographics"
];

function renderStaticFields() {
  const container = document.getElementById("animeInfoFields");
  container.innerHTML = "";

  ALL_FIELDS.forEach(key => {
    const wrapper = document.createElement("div");
wrapper.className = "field-box";
    const label = document.createElement("label");
    label.textContent = key;

    let field;

    if (textareaFields.includes(key)) {
  field = document.createElement("textarea");
field.style.overflow = "hidden";
field.addEventListener("input", () => autoResizeTextarea(field));
} else {
      field = document.createElement("input");

      if (numberFields.includes(key)) {
        field.type = "number";
      } else if (key === "rating") {
        field.type = "number";
        field.step = "0.1";
      } else {
        field.type = "text";
      }
    }

    field.dataset.field = key;

    wrapper.appendChild(label);
    wrapper.appendChild(field);
    container.appendChild(wrapper);
  });
  document.getElementById("animeInfoSection").style.display = "block";
}

function loadAnimeInfo(ai = {}) {
  bannerImage.src = ai.image_url || "";
  document.getElementById("image_url").value = ai.image_url || "";

  document.querySelectorAll("#animeInfoFields input, #animeInfoFields textarea")
    .forEach(field => {

      const key = field.dataset.field;

      if (Array.isArray(ai[key])) {
        field.value = ai[key].join(", ");
      } else {
        field.value = ai[key] ?? "";
      }

      // 🔥 FORCE AUTO RESIZE AFTER VALUE SET
      if (field.tagName.toLowerCase() === "textarea") {
        autoResizeTextarea(field);
      }
    });
}
let currentEditingIndex = null;
/* ================= LOAD EPISODES ================= */

function loadEpisodes(list) {
  episodes = list
    .map(e => ({ ...e, episode_number: Number(e.episode_number) })) // ensure number
    .sort((a, b) => a.episode_number - b.episode_number);

  renderEpisodeGrid();
}
function renderEpisodeGrid() {
  episodesContainer.innerHTML = "";

  episodes.forEach((ep, index) => {
    const box = document.createElement("div");
    box.className = "episode-box";
    box.innerText = ` 𝙀𝙥𝙞𝙨𝙤𝙙𝙚- ${ep.episode_number}`;

    box.addEventListener("click", () => openEditor(index));
box.addEventListener("touchstart", (e) => {
  e.preventDefault();
  openEditor(index);
});

    episodesContainer.appendChild(box);
  });
}

/* ================= EDITOR ================= */

function openEditor(index) {
  currentEditingIndex = index;
  const ep = episodes[index];

  const editor = document.getElementById("episodeEditor");
  editor.classList.add("active");
  editor.scrollIntoView({ behavior: "smooth" });

  editor.innerHTML = `
    <h4>Editing Episode ${ep.episode_number}</h4>

    <input type="number"min="1"max="9999"value="${ep.episode_number || ""}"placeholder="Episode Number"id="edit_episode_number">
    <input value="${ep.episode_title || ""}" placeholder="Episode Title" id="edit_episode_title">
    <input value="${ep.quality || ""}" placeholder="Quality" id="edit_quality">
    <input value="${ep.language || ""}" placeholder="Language" id="edit_language">
    <input value="${ep.server_name || ""}" placeholder="Server Name" id="edit_server_name">
    <input value="${ep.stream_url || ""}" placeholder="Stream URL" id="edit_stream_url">
    <input value="${ep.download_url || ""}" placeholder="Download URL" id="edit_download_url">

    <div class="editor-actions">
  <button type="button" id="saveEpisodeBtn" class="editor-btn">Save</button>
  <button type="button" id="cancelEpisodeBtn" class="editor-btn cancel">Cancel</button>
</div>
  `;

  document.getElementById("saveEpisodeBtn").onclick = saveEpisode;
[
  "edit_episode_number",
  "edit_episode_title",
  "edit_quality",
  "edit_language",
  "edit_server_name",
  "edit_stream_url",
  "edit_download_url"
].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener("input", () => {
    const ep = episodes[currentEditingIndex];

    ep.episode_number = Number(document.getElementById("edit_episode_number").value);
    ep.episode_title = document.getElementById("edit_episode_title").value;
    ep.quality = document.getElementById("edit_quality").value;
    ep.language = document.getElementById("edit_language").value;
    ep.server_name = document.getElementById("edit_server_name").value;
    ep.stream_url = document.getElementById("edit_stream_url").value;
    ep.download_url = document.getElementById("edit_download_url").value;

    
  });
});
  document.getElementById("cancelEpisodeBtn").onclick = closeEditor;
}

function saveEpisode() {
  const ep = episodes[currentEditingIndex];

  let num = Number(document.getElementById("edit_episode_number").value);

if (!Number.isSafeInteger(num) || num < 1) {
  alert("Invalid episode number. Please enter a valid number.");
  return;
}

ep.episode_number = num;
  ep.episode_title = document.getElementById("edit_episode_title").value;
  ep.quality = document.getElementById("edit_quality").value;
  ep.language = document.getElementById("edit_language").value;
  ep.server_name = document.getElementById("edit_server_name").value;
  ep.stream_url = document.getElementById("edit_stream_url").value;
  ep.download_url = document.getElementById("edit_download_url").value;

  closeEditor();
episodes.sort((a, b) => {
  const aNum = Number(a.episode_number);
  const bNum = Number(b.episode_number);

  if (!Number.isSafeInteger(aNum)) return 1;
  if (!Number.isSafeInteger(bNum)) return -1;

  return aNum - bNum;
});
renderEpisodeGrid();
}

function closeEditor(){
const editor = document.getElementById("episodeEditor");
editor.classList.remove("active");

setTimeout(()=>{
editor.innerHTML="";
},200);

currentEditingIndex = null;

}
/* ================= ADD EPISODE ================= */

const addBtn = document.getElementById("addEpisodeBtn");

addBtn.onclick = () => {
  const safeNumbers = episodes
  .map(e => Number(e.episode_number))
  .filter(n => Number.isSafeInteger(n));

const maxEp = safeNumbers.length
  ? Math.max(...safeNumbers)
  : 0;

  const newEp = {
    episode_number: maxEp + 1,
    episode_title: "",
    quality: "",
    language: "",
    server_name: "",
    stream_url: "",
    download_url: ""
  };

  episodes.push(newEp);

  // Re-render grid
  renderEpisodeGrid();

  // Open editor for the newly added episode
  const newIndex = episodes.length - 1;
  openEditor(newIndex);
};
/* ================= REMOVE EPISODE ================= */

const removeBtn = document.getElementById("removeEpisodeBtn");
const confirmBox = document.getElementById("removeConfirmBox");

removeBtn.onclick = () => {

  if (!episodes.length) {
    alert("No episodes to remove.");
    return;
  }

  const lastEp = episodes[episodes.length - 1];

  confirmBox.style.display = "block";
  confirmBox.innerHTML = `
    <div class="confirm-content">
      <p>Do you really want to remove Episode ${lastEp.episode_number}?</p>

      <div class="confirm-actions">
        <button id="confirmYes" class="danger-btn">Yes</button>
        <button id="confirmNo">No</button>
      </div>

      <div id="removeLoadingBar" class="loading-bar" style="display:none;"></div>
    </div>
  `;

  document.getElementById("confirmNo").onclick = () => {
    confirmBox.style.display = "none";
  };

  document.getElementById("confirmYes").onclick = () => {
  const loadingBar = document.getElementById("removeLoadingBar");
  loadingBar.style.display = "block";
  episodes.pop();
    
  renderEpisodeGrid();

  let width = 0;

  const interval = setInterval(() => {
    width += 10;
    loadingBar.style.width = width + "%";

    if (width >= 100) {
      clearInterval(interval);
      confirmBox.style.display = "none";
    }
  }, 80);
};
};
/* ===================== UPDATE ===================== */
updateBtn.addEventListener("click", async () => {

  if (!currentId) {
    alert("Select an anime first");
    return;
  }
  const animeInfo = {};
  document.querySelectorAll("#animeInfoFields input, #animeInfoFields textarea").forEach(field => {  
  let val = field.value;
    
  const arrayFields = ["tags", "title_synonyms", "studios", "dubbed_languages", "producers", "licensors", "themes", "demographics"];
  
  if (arrayFields.includes(field.dataset.field)) {
    animeInfo[field.dataset.field] = val.split(",").map(s => s.trim()).filter(Boolean);
  } else {
    animeInfo[field.dataset.field] = val;
  }
});
  const res = await fetch(`${API_BASE}/admin/anime/${currentId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    anime_info: animeInfo,
    streaming_links: episodes
  })
});
    if (res.ok) {
  localStorage.removeItem("admin_draft_" + currentId);
  try {
    await fetch("https://your-export-worker-url/trigger-export", {
      method: "POST",
      headers: {
        "Authorization": "Bearer YOUR_SECRET"
      }
    });

    alert("Updated Successfully & Export Triggered");
document.getElementById("draftStatus").style.display = "none";
  } catch (err) {
    console.error("Export trigger failed:", err);
    alert("Updated Successfully but Export Trigger Failed");
    
  }

} else {
  alert("Update Failed");
}
});
  renderStaticFields();
document.addEventListener("input", (e)=>{
  if(e.target.closest("#animeInfoFields") && currentId){
  }
});
  const lastId = localStorage.getItem("admin_last_id");

  if (lastId) {

    currentId = lastId;

    const option = [...select.options].find(o => o.value === lastId);

    if (option) {
      option.selected = true;
      select.dispatchEvent(new Event("change"));
    }

  }

  const clearCacheBtn = document.getElementById("clearCacheBtn");

if (clearCacheBtn) {
  clearCacheBtn.onclick = async () => {

    if (!currentId) {
      alert("Select an anime first");
      return;
    }

    localStorage.removeItem("admin_draft_" + currentId);
    alert("Draft cache cleared (local only)");

  };
}
/* ================= SAVE BUTTON IDLE SYSTEM ================= */

const saveBtn = document.getElementById("saveProgressBtn");

let idleTimer = null;
const IDLE_TIME = 600; 

function hideSaveBtn(){
  saveBtn.classList.remove("show");
}

function showSaveBtn(){
  saveBtn.classList.add("show");
}

function resetIdleTimer(){

  hideSaveBtn();

  clearTimeout(idleTimer);

  idleTimer = setTimeout(()=>{
    showSaveBtn();
  }, IDLE_TIME);

}

/* Detect activity */

[
"click",
"touchstart",
"scroll",
"keydown",
"input"
].forEach(event=>{
  document.addEventListener(event, resetIdleTimer, {passive:true});
});

/* Initial start */

resetIdleTimer();

/* Save click */

saveBtn.onclick = saveProgressNow;
  });