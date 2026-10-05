// v2.5 defect overlay patch — loads after app.js
function visualDefectOverlay(room, hotspot, symptom) {
  if (!room || !hotspot) return "";
  const type = room.type || "generic";
  const id = hotspot.id || "";
  const symptomId = symptom?.id || "";
  const pieces = [];
  const add = (cls, style = "", label = "") => pieces.push(`<span class="defect ${cls}" style="${style}" aria-hidden="true">${label}</span>`);

  if (id.includes("mould") || symptomId.includes("mould") || id === "behind-furniture-zone") {
    if (type === "bathroom") add("defect-mould defect-ceiling", "left:34%; top:24%; width:18%; height:11%;");
    else if (type === "kitchen") add("defect-mould", "left:25%; top:38%; width:15%; height:12%;");
    else if (type === "living") add("defect-mould", "left:25%; top:40%; width:15%; height:13%;");
    else add("defect-mould", "left:24%; top:38%; width:16%; height:13%;");
  }
  if (id.includes("window") || id.includes("reveal") || symptomId.includes("reveal")) {
    const pos = type === "bathroom" ? "left:58%; top:36%; width:22%; height:28%;" : "left:62%; top:34%; width:20%; height:30%;";
    add("defect-window", pos);
  }
  if (id.includes("vent") || id.includes("extractor") || symptomId.includes("vent") || symptomId.includes("fan")) {
    const pos = type === "bathroom" ? "left:72%; top:22%;" : type === "kitchen" ? "left:78%; top:28%;" : "left:70%; top:24%;";
    add("defect-airflow", pos);
  }
  if (id.includes("damp") || id.includes("stain") || id.includes("lower-wall") || symptomId.includes("damp") || symptomId.includes("tide")) {
    const pos = type === "external" ? "left:48%; top:68%; width:40%; height:14%;" : "left:28%; top:62%; width:24%; height:18%;";
    add("defect-damp", pos);
  }
  if (id.includes("seal") || symptomId.includes("sealant")) {
    add("defect-sealant", "left:31%; top:61%; width:39%; height:4%;");
  }
  if (id.includes("boxing") || symptomId.includes("boxing")) {
    add("defect-boxing", "left:76%; top:66%; width:18%; height:14%;");
  }
  if (id.includes("dpc") || id.includes("path") || id.includes("concrete") || symptomId.includes("dpc") || symptomId.includes("bridg")) {
    add("defect-ground", "left:58%; top:79%; width:52%; height:10%;", "DPC bridged");
  }
  if (id.includes("render") || id.includes("plinth") || symptomId.includes("render")) {
    add("defect-render", "left:48%; top:72%; width:47%; height:8%;");
  }
  if (id.includes("crack") || symptomId.includes("crack")) {
    add("defect-crack", "left:39%; top:48%; width:14%; height:31%;");
  }
  if (id.includes("rain") || id.includes("downpipe") || id.includes("gutter") || symptomId.includes("rain")) {
    add("defect-rainwater", "left:80%; top:43%; height:52%;");
  }
  if (!pieces.length) {
    add("defect-focus", `left:${Number(hotspot.x) || 50}%; top:${Number(hotspot.y) || 50}%;`);
  }
  const symptomTitle = symptom?.title || hotspot.label || "Selected defect";
  return `<div class="defect-layer" aria-hidden="true">${pieces.join("")}<span class="defect-caption">${escapeHTML(symptomTitle)}</span></div>`;
}

(function patchVisualDiagram() {
  function renderVisualDiagramPatched() {
    const room = getVisualRoom();
    const title = $("visualRoomTitle");
    const hint = $("visualRoomHint");
    const wrap = $("visualDiagram");
    if (!room || !wrap) return;
    if (title) title.textContent = room.title;
    if (hint) hint.textContent = room.hint || "";
    if (wrap.dataset) wrap.dataset.roomType = room.type || "generic";
    const selectedHotspot = getVisualHotspot();
    const selectedSymptom = getVisualSymptom();
    wrap.innerHTML = `${roomSvg(room.type)}${visualDefectOverlay(room, selectedHotspot, selectedSymptom)}${(room.hotspots || []).map(hotspot => `
    <button class="visual-hotspot ${hotspot.id === currentVisualHotspot ? "active" : ""} kind-${escapeHTML(hotspot.kind || "issue")}" type="button" style="left:${Number(hotspot.x) || 50}%; top:${Number(hotspot.y) || 50}%;" data-hotspot="${escapeHTML(hotspot.id)}">
      <span class="hotspot-dot"></span><span class="hotspot-label">${escapeHTML(hotspot.label)}</span>
    </button>`).join("")}`;
    wrap.querySelectorAll("button[data-hotspot]").forEach(button => {
      button.addEventListener("click", () => {
        currentVisualHotspot = button.dataset.hotspot;
        currentVisualSymptom = null;
        renderVisualDiagram();
        renderVisualIssuePanel();
        renderVisualBundlePanel();
      });
    });
  }
  renderVisualDiagram = renderVisualDiagramPatched;
})();
