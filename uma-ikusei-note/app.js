const main = document.querySelector("#main");
const abilityNames = ["スピード", "スタミナ", "パワー", "根性", "賢さ"];
const aptitudeNames = ["芝", "ダート", "短距離", "マイル", "中距離", "長距離", "逃げ", "先行", "差し", "追込"];
const pageNames = {
  home: "ホーム", owned: "所持一覧", plan: "育成計画",
  factors: "因子殿堂", race: "レース殿堂", updates: "更新履歴"
};
const formatNumber = new Intl.NumberFormat("ja-JP");
const collection = value => Array.isArray(value) ? value : [];

const state = {
  page: "home",
  part: "",
  planId: "",
  owned: { query: "", filter: "" },
  supports: { query: "", filter: "" },
  factors: { query: "", filter: "" },
  race: { query: "", filter: "" },
  compare: ["", ""]
};

let data;

function esc(value) {
  const escapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, char => escapes[char]);
}

function number(value) {
  return typeof value === "number" && Number.isFinite(value) ? formatNumber.format(value) : "未確認";
}

function horseName({ name, costume }) {
  return costume ? `${name}（${costume}）` : name;
}

function dated(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}年${Number(match[2])}月${Number(match[3])}日` : value ?? "未記録";
}

function href(page, ...parts) {
  return "#" + [page, ...parts.filter(Boolean).map(encodeURIComponent)].join("/");
}

function parseCSV(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const text = content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || cell === "") {
        quoted = !quoted;
      } else {
        cell += char;
      }
    } else if (!quoted && (char === "," || char === "\n")) {
      row.push(cell);
      cell = "";
      if (char === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error("CSVの引用符が閉じていません。");
  if (row.length || cell) rows.push([...row, cell]);
  const headers = rows.shift() ?? [];
  return rows.map(cells => Object.fromEntries(headers.map((head, i) => [head.trim(), cells[i] ?? ""])));
}

async function loadData() {
  const files = [
    ["roster", "roster.csv", "育成ウマ娘"],
    ["supports", "supports.csv", "サポートカード"],
    ["plan", "plan.json", "育成計画"],
    ["hall", "hall.json", "殿堂馬"],
    ["updates", "updates.json", "更新履歴"]
  ];
  const results = await Promise.allSettled(files.map(async ([, file]) => {
    const response = await fetch(`./data/${file}`);
    if (!response.ok) throw new Error(`データ取得に失敗しました。${response.status}`);
    return file.endsWith(".csv") ? parseCSV(await response.text()) : (await response.json()) ?? {};
  }));

  const model = { issues: [] };
  for (const [index, result] of results.entries()) {
    const [key, , label] = files[index];
    if (result.status === "fulfilled") {
      model[key] = result.value;
    } else {
      model.issues.push(label);
      model[key] = key === "roster" || key === "supports" ? [] : {};
    }
  }
  model.entries = collection(model.hall.entries);
  model.race = model.entries.filter(entry => entry.race);
  model.factors = model.entries.filter(entry => entry.factors);
  model.byId = new Map(model.entries.map(entry => [entry.id, entry]));
  return model;
}

function empty(message = "まだ登録がありません。") {
  return `<p class="notice">${esc(message)}</p>`;
}

function heading(title, subtitle) {
  return `<header class="page-head"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</header>`;
}

function panelTitle(title, action = "") {
  return `<div class="panel-title"><h2>${esc(title)}</h2>${action}</div>`;
}

function tag(label, style = "") {
  return `<span class="tag ${style}">${esc(label)}</span>`;
}

function details(title, contents, open = false) {
  return `<details class="disclosure"${open ? " open" : ""}><summary>${esc(title)}</summary><div class="details-body">${contents}</div></details>`;
}

function listMarkup(items, className = "list") {
  return `<ul class="${className}">${items.map(item => `<li>${item}</li>`).join("")}</ul>`;
}

function facts(pairs) {
  const items = pairs.filter(([, value]) => value);
  return `<dl class="facts">${items.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`;
}

function table(columns, rows, options = "") {
  return `<div class="table-wrap"><table class="info-table ${options}">
    <thead><tr>${columns.map(column => `<th scope="col">${esc(column)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(cells => `<tr>${cells.map((cell, i) => `<td data-label="${esc(columns[i])}">${cell}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}

function countLabel(n) {
  return `<p class="results-note" role="status">${number(n)}件</p>`;
}

function withinQuery(query, ...values) {
  const normalized = text => String(text ?? "").normalize("NFKC").toLocaleLowerCase("ja");
  const haystack = normalized(values.flat().join(" "));
  return normalized(query).trim().split(/\s+/).every(term => haystack.includes(term));
}

function controls(key, { queryLabel, filterLabel, filters }) {
  const filter = state[key];
  return `<div class="controls">
    <label class="field search">${esc(queryLabel)}
      <input type="search" data-filter-key="${key}" data-field="query" value="${esc(filter.query)}" placeholder="入力して絞り込む">
    </label>
    <label class="field">${esc(filterLabel)}
      <select data-filter-key="${key}" data-field="filter">
        <option value="">すべて</option>
        ${filters.map(([value, label]) => `<option value="${esc(value)}"${value === filter.filter ? " selected" : ""}>${esc(label)}</option>`).join("")}
      </select>
    </label>
  </div>`;
}

function home() {
  const teams = collection(data.plan.teams);
  const next = collection(data.plan.order).filter(canStartTraining).slice(0, 2);
  const recent = [...data.race].sort((a, b) => String(b.race.confirmedAt ?? "").localeCompare(String(a.race.confirmedAt ?? ""))).slice(0, 2);
  const counters = [
    ["育成ウマ娘", data.roster.length, href("owned")],
    ["所持SSR", data.supports.length, href("owned", "supports")],
    ["因子殿堂", data.factors.length, href("factors")],
    ["レース殿堂", data.race.length, href("race")]
  ];

  const teamRows = teams.map(team => `<a class="distance" data-distance="${esc(team.distance)}" href="${href("plan", team.distance)}">${esc(team.distance)}</a>
    ${collection(team.members).filter(planGuide).map(id => {
      const guide = planGuide(id);
      const status = trainingStatus(id);
      const label = status === "complete" ? "・完成" : status === "provisional" ? "・暫定" : "";
      return `<div class="team-name"><strong>${esc(horseName(guide.subject))}</strong><small>${esc(guide.style)}${label}</small></div>`;
    }).join("")}`);
  const candidates = next.map(id => {
    const guide = planGuide(id);
    const role = trainingRole(guide);
    return `<a href="${guideHref(id)}">${esc(horseName(guide.subject))}</a>
      <p>${esc(role)}${trainingStatus(id) === "trial" ? "・手持ちで試走可" : ""}</p>`;
  });

  return `<section class="hero">
    <div class="track" aria-hidden="true"></div>
    <div>
      <p class="date">記録日 <time datetime="${esc(data.plan.updatedAt ?? "")}">${esc(dated(data.plan.updatedAt))}</time></p>
      <h1>所持と育成計画</h1>
      <div class="actions">
        <a class="button primary" href="#owned">所持一覧を開く</a>
        <a class="button secondary" href="#plan">育成計画を開く</a>
      </div>
    </div>
  </section>
  <div class="stats-grid">${counters.map(([label, value, target]) => `<a class="stat-card" href="${target}"><span>${label}</span><strong class="num">${number(value)}</strong></a>`).join("")}</div>
  <div class="home-grid">
    <section class="panel">${panelTitle("距離別編成", '<a href="#plan">育成計画を見る</a>')}
      ${teamRows.length ? `<ul class="list">${teamRows.map(row => `<li class="home-team">${row}</li>`).join("")}</ul>` : empty("編成枠はまだ登録されていません。")}
    </section>
    <div class="stack">
      <section class="panel">
        ${panelTitle("次の育成候補")}
        ${candidates.length ? `<ul class="list">${candidates.map(item => `<li class="quick-item">${item}</li>`).join("")}</ul>` : empty("育成候補はまだ登録されていません。")}
      </section>
      <section class="panel">
        ${panelTitle("最近のレース殿堂", '<a href="#race">一覧を見る</a>')}
        ${recent.length ? `<ul class="list">${recent.map(entry => `<li class="quick-item"><a href="${href("race", entry.id)}">${esc(horseName(entry))}</a><p class="muted num">${esc(entry.race.style)}　${number(entry.score)}</p></li>`).join("")}</ul>` : empty()}
      </section>
    </div>
  </div>`;
}

function owned() {
  const support = state.part === "supports";
  const key = support ? "supports" : "owned";
  const role = support ? "カード名・キャラクター名" : "名前・衣装";
  const filterLabel = support ? "タイプ" : "才能開花";
  const filterValues = support
    ? [...new Set(data.supports.map(card => card.type))].filter(Boolean).map(type => [type, type])
    : [...new Set(data.roster.map(character => character.stars))].filter(Boolean).sort((a, b) => Number(b) - Number(a)).map(stars => [stars, `星${stars}`]);
  const deck = data.plan.decks?.["deck-5"];
  const deckMarkup = support && deck ? `<section class="panel section-gap">${panelTitle("記録にあるデッキ5")}
      ${supportDeck(deck)}
      <p class="meta-note">育成前のサポート編成画面で確認した6枚です。</p>
    </section>` : "";
  return `${heading("所持一覧", "手持ちの育成ウマ娘とサポートカードを確認。")}
    <nav class="nav-tabs" aria-label="所持一覧の切り替え">
      <a href="#owned"${support ? "" : ' aria-current="page"'}>育成ウマ娘</a>
      <a href="#owned/supports"${support ? ' aria-current="page"' : ""}>サポートカード</a>
    </nav>
    <section class="panel">
      ${controls(key, { queryLabel: role, filterLabel, filters: filterValues })}
      <div id="results">${ownedResults(key)}</div>
    </section>${deckMarkup}`;
}

function ownedResults(key) {
  const support = key === "supports";
  const filter = state[key];
  if (support) {
    const rows = data.supports.filter(card => (!filter.filter || card.type === filter.filter) &&
      withinQuery(filter.query, card.name, card.character, card.type));
    return countLabel(rows.length) + (rows.length ? table(
      ["カード", "キャラクター", "タイプ", "凸数"],
      rows.map(card => [`<strong>${esc(card.name)}</strong>`, esc(card.character), tag(card.type), esc(card.limit)]),
      "responsive"
    ) : empty("条件に合うサポートカードはありません。"));
  }
  const rows = data.roster.filter(character => (!filter.filter || character.stars === filter.filter) &&
    withinQuery(filter.query, character.name, character.costume, character.role));
  return countLabel(rows.length) + (rows.length ? table(
    ["馬名（衣装）", "才能開花", "担当予定"],
    rows.map(character => [`<strong>${esc(horseName(character))}</strong>`, tag(`星${character.stars}`), esc(character.role)]),
    "responsive"
  ) : empty("条件に合う育成ウマ娘はありません。"));
}

function factorLabel(factor) {
  return factor?.name ? `${factor.name}${Number.isInteger(factor.stars) ? `★${factor.stars}` : ""}` : "";
}

function linkedFactor(node) {
  const references = data.hall.parentReferences ?? {};
  if (node?.recordId) return data.byId.get(node.recordId);
  if (node?.referenceId && Object.hasOwn(references, node.referenceId)) return references[node.referenceId];
}

function pedigreeNode(node) {
  const record = linkedFactor(node);
  const title = record ? horseName(record) : node.name ? horseName(node) : node.label;
  const score = record?.score;
  const rank = record?.rank || node.rank;
  const blueLabel = node.blue || factorLabel(record?.factors?.blue);
  const redLabel = node.red || factorLabel(record?.factors?.red);
  const uniqueLabel = factorLabel(record?.factors?.unique);
  const identity = [rank, Number.isFinite(score) ? `評価点 ${number(score)}` : ""].filter(Boolean).join("・");

  return `<div class="pedigree-node">
    <strong>${esc(title || "個体未確認")}</strong>
    ${identity ? `<p class="pedigree-meta num">${esc(identity)}</p>` : ""}
    ${redLabel || blueLabel || uniqueLabel ? `<div class="tags">
      ${redLabel ? tag("赤 " + redLabel, "red") : ""}
      ${blueLabel ? tag("青 " + blueLabel, "blue") : ""}
      ${uniqueLabel ? tag("固有 " + uniqueLabel, "unique") : ""}
    </div>` : ""}
    ${node.status ? `<p class="pedigree-meta">${esc(node.status)}</p>` : ""}
    ${node.condition ? `<p class="pedigree-meta">${esc(node.condition)}</p>` : ""}
    ${node.recordId && record?.factors ? `<a class="source" href="${href("factors", record.id)}">因子殿堂で見る</a>` : ""}
  </div>`;
}

function planGuide(id) {
  const guides = data.plan.guides ?? {};
  return Object.hasOwn(guides, id) ? guides[id] : undefined;
}

function guideHref(id) {
  return href("plan", planGuide(id)?.distance, id);
}

function trainingRole({ distance, style }) {
  return style ? `${distance === "ダート" ? "ダートマイル" : distance}・${style}` : distance;
}

function isFactorGuide(id) {
  return collection(data.plan.parentPlans).includes(id);
}

function trainingResult(id) {
  const result = data.byId.get(planGuide(id)?.recordId);
  return result?.[isFactorGuide(id) ? "factors" : "race"] ? result : null;
}

function unmetAptitudes(result, target) {
  const ranks = "GFEDCBAS";
  return Object.entries(target ?? {}).flatMap(([name, minimum]) => {
    const actual = result.aptitudes?.[aptitudeNames.indexOf(name)];
    return actual && ranks.indexOf(actual) >= ranks.indexOf(minimum)
      ? [] : [[name, `${actual || "未確認"}（目標${minimum}）`]];
  });
}

function ownedTrial(guide) {
  const ids = collection(guide?.setup?.trialParents);
  if (ids.length !== 2 || ids[0] === ids[1] || ids.some(id => !data.byId.get(id)?.factors)) return null;
  return { branches: ids.map((recordId, index) => ({
    side: `自前 ${index + 1}`, parent: { recordId }, grandparents: []
  })) };
}

function trainingStatus(id) {
  const guide = planGuide(id);
  if (!guide) return "";
  const result = trainingResult(id);
  if (result) return unmetAptitudes(result, guide.goals?.requiredAptitudes).length ? "provisional" : "complete";
  if (guide.optional) return "optional";
  if (guide.requiresParent && !trainingResult(guide.requiresParent)) return "waiting";
  return ownedTrial(guide) ? "trial" : "planned";
}

function canStartTraining(id) {
  return ["trial", "planned"].includes(trainingStatus(id));
}

function trainingTag(id) {
  switch (trainingStatus(id)) {
    case "complete": return tag("完成", "confirmed");
    case "provisional": return tag("暫定・出走可", "plan");
    case "trial": return tag("試走可", "trial");
    case "optional": return tag("追加候補", "plan");
    case "waiting": return tag("親待ち", "plan");
    default: return tag("計画あり", "training-planned");
  }
}

function trainingProgress(ids) {
  const statuses = ids.map(trainingStatus).filter(Boolean);
  return {
    total: statuses.length,
    complete: statuses.filter(status => status === "complete").length,
    provisional: statuses.filter(status => status === "provisional").length,
    waiting: statuses.filter(status => status === "waiting").length
  };
}

function progressCard(label, target, progress, summary, style) {
  return `<a class="training-progress ${style}" href="${target}">
    <span class="training-progress-label">${esc(label)}</span>
    <span class="training-progress-count"><strong class="num">${number(progress.complete)}</strong><span class="num"> / ${number(progress.total)} 完成</span></span>
    <progress value="${progress.complete}" max="${progress.total || 1}" aria-label="${esc(label)}の完成数"></progress>
    <small>${esc(summary)}</small>
  </a>`;
}

function trainingOverview() {
  const factorGuides = collection(data.plan.parentPlans).filter(planGuide);
  const parentIds = factorGuides.filter(id => !planGuide(id).optional);
  const optionalParentIds = factorGuides.filter(id => planGuide(id).optional);
  const research = data.plan.factorResearch;
  const teams = collection(data.plan.teams);
  const raceIds = teams.flatMap(team => collection(team.members)).filter(planGuide);
  const factorProgress = trainingProgress(parentIds);
  const raceProgress = trainingProgress(raceIds);
  const teamProgress = teams.map(team => ({ team, ...trainingProgress(collection(team.members)) }));
  const order = collection(data.plan.order).filter(planGuide);
  const nextRace = order.filter(canStartTraining).slice(0, 2);
  const nextFactor = parentIds.filter(canStartTraining).slice(0, 2);

  const races = teamProgress.map(({ team, complete, total }) => {
    const members = collection(team.members).filter(planGuide);
    const alternates = collection(team.alternates);
    return `<section class="training-team" id="plan-distance-${esc(team.distance)}" tabindex="-1">
      <header class="training-team-head">
        <h3>${esc(team.distance)}</h3><span class="num">${number(complete)} / ${number(total)} 完成</span>
      </header>
      ${team.preparation ? `<p class="sheet-small">${esc(team.preparation)}</p>` : ""}
      ${members.length ? listMarkup(members.map(id => trainingListRow(id)), "training-race-slots") : empty("出走枠は未登録です。")}
      ${alternates.length ? details("予備・比較候補", facts(alternates.map(item => [
        horseName(item), item.stars ? `星${item.stars}・${item.role}` : item.role
      ]))) : ""}
    </section>`;
  });

  return `${heading("育成計画一覧")}
    <div class="stack">
      <div class="training-progress-grid" aria-label="育成の進捗">
        ${progressCard("因子馬育成", href("plan", "factor-training"), factorProgress,
          `完成未確認 ${number(factorProgress.total - factorProgress.complete)} 件${factorProgress.waiting ? `（親待ち ${number(factorProgress.waiting)}）` : ""}`, "factor-progress")}
        ${progressCard("レース馬育成", href("plan", "race-training"), raceProgress,
          `登録 ${number(raceProgress.complete + raceProgress.provisional)} 枠・暫定 ${number(raceProgress.provisional)} 枠・親待ち ${number(raceProgress.waiting)} 枠`, "race-progress")}
      </div>
      ${nextRace.length || nextFactor.length ? `<section class="panel">
        ${panelTitle("次に進める育成")}
        <div class="training-team-grid training-start">
          ${[["レース馬の着手候補", nextRace], ["先に作る因子馬", nextFactor]].filter(([, ids]) => ids.length).map(([label, ids]) => `
            <section class="training-team">
              <header class="training-team-head"><h3>${esc(label)}</h3></header>
              ${listMarkup(ids.map(id => trainingListRow(id, planGuide(id).purpose)), "training-race-slots")}
            </section>`).join("")}
        </div>
      </section>` : ""}
      <section class="panel" id="plan-factor-training" tabindex="-1">
        ${panelTitle("因子馬育成", `<a class="source" href="${href("factors", "coverage")}">因子の手持ちを確認</a>`)}
        ${research?.parentStandard ? `<p class="training-next">${esc(research.parentStandard)}</p>` : ""}
        ${research ? `<div class="factor-research">
          ${details(`攻略の確認日と提案ルール　${dated(research.checkedAt)}`, `
            <p>${esc(research.policy)}</p>
            <p>${esc(research.scope)}</p>
            <p>${esc(research.scenario)}</p>
            ${factorResearchLinks(research.generalSources)}`)}
        </div>` : ""}
        ${parentIds.length ? listMarkup(parentIds.map(id => trainingListRow(id, planGuide(id).purpose || "継承用")),
          "training-race-slots training-factor-slots") : empty("親を作る計画はまだありません。")}
        ${optionalParentIds.length ? details("必要に応じて追加する因子馬",
          listMarkup(optionalParentIds.map(id => trainingListRow(id, planGuide(id).purpose)),
            "training-race-slots training-factor-slots")) : ""}
      </section>
      <section class="panel" id="plan-race-training" tabindex="-1">
        ${panelTitle("レース馬育成", `<a class="source" href="${href("race")}">レース殿堂</a>`)}
        ${races.length ? `<nav class="nav-tabs distance-tabs training-distance-tabs" aria-label="距離別の完成枠">
          ${teamProgress.map(({ team, complete, total }) => `<a href="${href("plan", team.distance)}"${team.distance === state.part ? ' aria-current="location"' : ""}>
            ${esc(team.distance)}<span class="num">${number(complete)} / ${number(total)}</span>
          </a>`).join("")}
        </nav>
        <div class="training-team-grid">${races.join("")}</div>` : empty("編成枠はまだ登録されていません。")}
        ${order.length ? details("レース馬の育成優先順", `<ol class="list plan-order">
          ${order.map(id => {
            const guide = planGuide(id);
            return `<li class="plan-item"><a href="${guideHref(id)}">${esc(horseName(guide.subject))}</a>
              <small>${esc(trainingRole(guide))}</small>${trainingTag(id)}</li>`;
          }).join("")}
        </ol>`) : ""}
      </section>
    </div>`;
}

function trainingListRow(id, role) {
  const guide = planGuide(id);
  return `<a class="training-race-slot" href="${guideHref(id)}">
    <span class="training-list-text"><strong>${esc(horseName(guide.subject))}</strong>
      <small>${esc(role || guide.style)}<span aria-hidden="true">｜</span>${esc(guide.target)}</small></span>
    ${trainingTag(id)}
  </a>`;
}

function parentLineup(pedigree, requiredId) {
  const plannedParent = trainingResult(requiredId);
  const requiredPlan = planGuide(requiredId);
  const completedAncestor = trainingResult(requiredPlan?.requiresParent);
  const plannedAncestors = collection(requiredPlan?.setup?.parents?.branches)
    .map(side => side.side === "自前側" && completedAncestor ? { recordId: completedAncestor.id } : side.parent)
    .filter(Boolean);
  const branches = collection(pedigree?.branches).map(side => {
    const own = side.side === "自前側";
    const useCompletedParent = own && Boolean(plannedParent);
    const parent = useCompletedParent ? { recordId: plannedParent.id } : side.parent;
    const recorded = collection(linkedFactor(parent)?.factors?.parents);
    const projected = own && !plannedParent && !recorded.length && plannedAncestors.length;
    const grandparents = projected ? plannedAncestors : recorded.length ? recorded : useCompletedParent ? [] : collection(side.grandparents);
    return `<div class="pedigree-branch">
      <h4>${esc(side.side)}</h4>
      ${pedigreeNode(parent ?? {})}
      <div class="pedigree-descendants">
        ${grandparents.length
          ? details(projected ? "予定の祖父母を見る" : "祖父母を見る",
            listMarkup(grandparents.map(pedigreeNode), "pedigree-grandparents"))
          : '<p class="pedigree-meta">祖父母は未確認</p>'}
      </div>
    </div>`;
  }).join("");
  return branches ? `<div class="pedigree-branches">${branches}</div>` : empty("親編成は未登録です。");
}

function priorityItems(rows, isFactor) {
  const labels = { "◎": "優先", "○": "次点", "△": "条件付き" };
  return listMarkup(rows.map(([priority, name, text]) => `
    <span class="sheet-priority" data-priority="${esc(priority)}" aria-label="${esc(labels[priority])}">${esc(priority)}</span>
    <div>${isFactor ? `<span class="sheet-factor-kind" data-factor="${esc(name)}">${esc(name)}</span> <strong>${esc(text)}</strong>`
      : `<strong>${esc(name)}</strong>${text ? `<p>${esc(text)}</p>` : ""}`}</div>`), "sheet-priority-list");
}

function goalPriorities(rows, isFactor) {
  const primary = rows.filter(([priority]) => priority === "◎");
  const extra = rows.filter(([priority]) => priority !== "◎");
  return primary.length && extra.length
    ? `${priorityItems(primary, isFactor)}${details("次点・条件付き", priorityItems(extra, isFactor))}`
    : priorityItems(rows, isFactor);
}

function trainingGoals(guide, result, factor) {
  const goals = guide.goals ?? {};
  const skills = collection(goals.skills);
  const factors = collection(goals.factors);
  const unmet = result ? unmetAptitudes(result, goals.requiredAptitudes) : [];
  return `<section class="panel sheet-section sheet-goals" id="plan-goals" tabindex="-1">
    ${panelTitle("育成後の目標", !factor && result ? tag("再育成案") : tag("目標案"))}
    <div class="sheet-stat-target">
      <h3>目標ステータス</h3>
      ${Array.isArray(goals.stats) ? `<dl class="sheet-stats">${abilityNames.map((name, index) =>
        `<div><dt>${name}</dt><dd class="num">${number(goals.stats[index])}</dd></div>`).join("")}</dl>` : empty("目標ステータスは未登録です。")}
      ${goals.aptitude ? `<p class="sheet-aptitude"><span>適性</span><strong>${esc(goals.aptitude)}</strong></p>` : ""}
      ${unmet.length ? `<div class="sheet-setting">${facts(unmet.map(([name, value]) => [`登録個体の${name}`, value]))}</div>` : ""}
      ${goals.note ? `<p class="meta-note">${esc(goals.note)}</p>` : ""}
    </div>
    <p class="sheet-priority-key">◎ 優先　○ 次点　△ 条件付き</p>
    <div class="sheet-goal-grid">
      <section id="plan-acquire" tabindex="-1">
        <h3>獲得したいスキル</h3>
        ${skills.length ? goalPriorities(skills, false) : empty("目標スキルは未登録です。")}
      </section>
      <section>
        <h3>狙う因子</h3>
        ${factors.some(([, kind]) => kind === "白") ? '<p class="sheet-small">白のスキル因子の◎は、狙う順の目安。</p>' : ""}
        ${factor ? "" : '<p class="sheet-small">完成後に親として使う場合</p>'}
        ${factors.length ? goalPriorities(factors, true) : empty("目標因子は未登録です。")}
      </section>
    </div>
    ${factor && goals.factorCheck ? `<div class="sheet-setting sheet-policy">
      <h3>採用基準</h3><p>${esc(goals.factorCheck)}</p>
    </div>` : ""}
    ${collection(goals.sources).length ? `<div class="sheet-setting">${details("スキル・採用基準の出典", factorResearchLinks(goals.sources))}</div>` : ""}
    ${result ? `<p class="sheet-record-link"><a href="${href(factor ? "factors" : "race", result.id)}">登録済みの個体 ${number(result.score)} を見る</a></p>` : ""}
  </section>`;
}

function deckCard(id) {
  return data.plan.friendCards?.[id] ?? data.supports.find(card => card.id === id);
}

function supportDeck(deck) {
  return listMarkup(collection(deck?.cards).map(id => {
    const card = deckCard(id);
    if (!card) return `<div class="sheet-card">${empty("カード未登録")}</div>`;
    const rental = Object.hasOwn(data.plan.friendCards ?? {}, id);
    return `<div class="sheet-card" data-type="${esc(card.type)}">
      <div class="sheet-card-meta"><span>${esc(card.type)}・${esc(card.limit)}</span>${rental ? tag("フレンド", "unique") : ""}</div>
      <strong>${esc(card.character)}</strong><p>${esc(card.name)}</p>
    </div>`;
  }), "sheet-deck");
}

function trainingSupport(setup) {
  const decks = data.plan.decks ?? {};
  const deck = decks[setup.deckId];
  const alternatives = collection(setup.alternateDeckIds).map(id => decks[id]).filter(Boolean);
  const research = data.plan.factorResearch?.support;
  return `<section class="panel sheet-section" id="plan-support" tabindex="-1">
    <div class="sheet-position-head"><h3>サポート編成</h3>${deck ? tag(deck.name) : ""}</div>
    ${deck ? supportDeck(deck) : empty("サポート編成は未登録です。")}
    ${setup.deckNote || deck?.note ? `<p class="meta-note">${esc(setup.deckNote ?? deck.note)}</p>` : ""}
    ${alternatives.length ? `<div class="sheet-setting">${details("条件付きの代替編成", alternatives.map(option => `
      <div class="sheet-setting"><h4>${esc(option.name)}</h4>
      <p class="sheet-hint-summary">${esc(option.note)}</p>${supportDeck(option)}</div>`).join(""))}</div>` : ""}
    ${research ? `<div class="sheet-setting">${details(`編成の判断と出典　${dated(research.checkedAt)}`, `
      <p>${esc(research.summary)}</p>${factorResearchLinks(research.sources)}`)}</div>` : ""}
  </section>`;
}

function plannedRaces(reservations) {
  return listMarkup(reservations.map(({ period, race, grade, purpose }) => `
    <span class="training-race-date">${esc(period)}</span>
    <div><strong>${esc(race)}</strong>${grade ? tag(grade) : ""}${purpose ? `<p>${esc(purpose)}</p>` : ""}</div>`), "training-calendar");
}

function trainingRotation(route) {
  const goals = collection(route?.goals);
  const reservations = collection(route?.reservations);
  const initial = reservations.filter(race => race.kind === "set");
  const optional = reservations.filter(race => race.kind !== "set");
  return `<section class="sheet-setting" id="plan-rotation" tabindex="-1">
    <div class="sheet-row-title"><h4>出走ローテーション</h4>
      ${route ? tag(`初回予約 ${number(initial.length)}戦`, "confirmed") : ""}</div>
    ${route?.start ? `<p class="sheet-hint-summary">${esc(route.start)}</p>` : ""}
    ${initial.length ? plannedRaces(initial) : `<p>${route ? "初回は固定目標で進める。" : "ローテは未登録です。"}</p>`}
    ${optional.length ? details(`必要に応じて追加するレース ${number(optional.length)}件`, plannedRaces(optional)) : ""}
    ${goals.length ? details("ゲームの育成目標・期限", facts(goals)) : ""}
    ${route?.note ? `<p class="meta-note">${esc(route.note)}</p>` : ""}
    ${route?.goalSource ? `<p class="meta-note"><a class="source" href="${esc(route.goalSource)}">育成目標の出典</a></p>` : ""}
  </section>`;
}

function factorResearchLinks(ids) {
  const sources = data.plan.factorResearch?.sources ?? {};
  const entries = collection(ids).filter(id => Object.hasOwn(sources, id)).map(id => sources[id]);
  return listMarkup(entries.map(([label, url]) => `<a class="source" href="${esc(url)}">${esc(label)}</a>`));
}

function trainingHints(setup) {
  const hints = collection(setup.hints);
  const review = setup.hintReview;
  const alternates = collection(review?.alternates);
  return `<section class="sheet-setting" id="plan-hints" tabindex="-1">
    <div class="sheet-row-title"><h4>優先ヒント</h4><span class="num">主編成 ${number(hints.length)} / 10枠</span></div>
    ${review ? `<p class="sheet-hint-summary">${esc(review.summary)}</p>` : ""}
    ${hints.length ? `<ol class="sheet-hints">${hints.map(([skill, cardId, condition]) => {
      const character = deckCard(cardId)?.character;
      return `<li><div><strong>${esc(skill)}</strong>
        ${character || condition ? `<p>${esc([character, condition].filter(Boolean).join("・"))}</p>` : ""}</div></li>`;
    }).join("")}</ol>` : empty("優先スキルは未登録です。")}
    ${review ? `
      ${alternates.length ? details("本人・継承などから取る候補", priorityItems(alternates, false)) : ""}
      <p class="meta-note">候補に出たヒントを最大10個まで設定。本人の初期・覚醒スキルは終了時の取得も確認します。狙う白因子のスキルは育成終了前に取得します。</p>
      ${details("ヒントと取得経路の出典", factorResearchLinks([
        ...collection(review.sources), "selection", "settings", "higher"
      ]))}` : `
      <p class="meta-note">育成中にヒントを優先する設定。サポート名の後ろに入手条件を表示。</p>`}
  </section>`;
}

function setupExample(example) {
  if (!example) return "";
  return details("共有画像で確認できた設定", `${facts([
    ["自主トレ方針", example.policy],
    ["ローテーション", `${example.rotation}（表示レース ${collection(example.visibleRaces).join("・")}）`],
    ["目覚まし時計", example.continue],
    ["優先スキル", collection(example.hints).join("／")]
  ])}<p class="meta-note">${esc(example.note)}</p>`);
}

function trainingDetail(id, guide) {
  const factor = isFactorGuide(id);
  const label = factor ? "因子馬育成" : "レース馬育成";
  const result = trainingResult(id);
  const setup = guide.setup ?? {};
  const pedigree = setup.parents;
  const trial = ownedTrial(guide);
  const parent = planGuide(guide.requiresParent);
  const parentResult = trainingResult(guide.requiresParent);
  const policy = setup.policy ?? collection(data.plan.teams).find(team => team.distance === guide.distance)?.policy;
  const dependentIds = factor ? [
    ...collection(data.plan.parentPlans), ...collection(data.plan.teams).flatMap(team => collection(team.members)),
  ].filter(childId => planGuide(childId)?.requiresParent === id) : [];

  const target = guideHref(id);
  return `<article class="training-detail training-sheet">
    <nav class="training-breadcrumb" aria-label="育成計画の階層">
      <a href="${href("plan")}">育成計画一覧</a><span aria-hidden="true">/</span>
      <a href="${href("plan", factor ? "factor-training" : guide.distance)}">${label}</a>
    </nav>
    <header class="sheet-header">
      <div class="tags">${tag(factor ? ["継承用", guide.style].filter(Boolean).join("・") : trainingRole(guide))}${trainingTag(id)}</div>
      <h1>${esc(horseName(guide.subject))}</h1>
      <p>${esc(guide.target)}</p>
    </header>
    <nav class="sheet-nav" aria-label="育成目標と設定画面">
      <a href="${target}/goals">育成目標</a>
      <a href="${target}/parents">親編成</a>
      <a href="${target}/support">サポート編成</a>
      <a href="${target}/final">最終確認</a>
    </nav>
    <div class="stack">
      ${trainingGoals(guide, result, factor)}
      <section class="sheet-setup" aria-labelledby="setup-heading">
        <h2 id="setup-heading">育成設定</h2>
        <div class="stack">
          <section class="panel sheet-section" id="plan-parents" tabindex="-1">
            <div class="sheet-position-head"><h3>継承ウマ娘選択</h3>
              <div class="tags">${pedigree?.status ? tag(pedigree.status) : ""}
                ${pedigree?.affinity ? tag(`相性${pedigree.affinity}`, "confirmed") : ""}</div></div>
            ${parent ? `<p class="training-prerequisite">
              ${tag(parentResult ? "親を確保" : "親の育成が先", parentResult ? "confirmed" : "plan")}
              <a href="${guideHref(guide.requiresParent)}">${esc(horseName(parent.subject))}の因子馬育成</a>
            </p>` : ""}
            ${setup.parentCheck ? `<p class="sheet-small">${esc(setup.parentCheck)}</p>` : ""}
            ${trial ? `<div class="sheet-setting sheet-trial">
              <div class="sheet-row-title"><h4>手持ちだけで試走</h4>${tag("試走用", "trial")}</div>
              ${setup.trialNote ? `<p class="sheet-hint-summary">${esc(setup.trialNote)}</p>` : ""}
              ${parentLineup(trial)}
            </div>
            <div class="sheet-setting sheet-row-title"><h4>本育成用の親</h4></div>` : ""}
            ${parentLineup(pedigree, guide.requiresParent)}
            ${guide.purpose ? `<p class="sheet-small sheet-parent-use">用途　<strong>${esc(guide.purpose)}</strong></p>` : ""}
            ${dependentIds.length ? `<p class="sheet-small sheet-parent-use">この個体を使う育成</p>
              ${listMarkup(dependentIds.map(childId => `<a href="${guideHref(childId)}">${esc(horseName(planGuide(childId).subject))}</a>
                <small>　${isFactorGuide(childId) ? "因子馬育成" : "レース馬育成"}</small>`), "training-children")}` : ""}
            ${pedigree?.note ? `<p class="meta-note">${esc(pedigree.note)}</p>` : ""}
          </section>
          ${trainingSupport(setup)}
          <section class="panel sheet-section sheet-final" id="plan-final" tabindex="-1">
            <div class="sheet-position-head"><h3>最終確認</h3>${tag("自主トレ育成", "confirmed")}</div>
            ${data.plan.scenario ? `<p class="sheet-scenario">${esc(data.plan.scenario)}</p>` : ""}
            <div class="sheet-setting sheet-policy">
              <h4>自主トレ方針</h4><strong>${esc(policy ?? "未設定")}</strong>
            </div>
            ${setup.finalCheck ? `<p class="sheet-small">${esc(setup.finalCheck)}</p>` : ""}
            ${trainingRotation(setup.rotation)}
            ${trainingHints(setup)}
            ${data.plan.factorResearch?.finish ? details("育成終了時のスキル取得・モード別の設定", `
              ${facts([["終了時の取得", data.plan.factorResearch.finish[factor ? "factor" : "race"]],
                ["駿大祭の教え", data.plan.factorResearch.finish.teach]])}
              ${factorResearchLinks(data.plan.factorResearch.finish.sources)}`) : ""}
            ${id === "smart-falcon" ? setupExample(data.plan.setupExample) : ""}
          </section>
        </div>
      </section>
    </div>
  </article>`;
}

function plan() {
  const guide = planGuide(state.planId);
  return guide ? trainingDetail(state.planId, guide) : trainingOverview();
}

function abilities(entry) {
  if (!Array.isArray(entry.stats)) return "";
  return `<dl class="abilities">${abilityNames.map((name, i) => `<div><dt>${name}</dt><dd class="num">${number(entry.stats[i])}</dd></div>`).join("")}</dl>`;
}

function aptitudes(entry) {
  if (!Array.isArray(entry.aptitudes)) return "";
  return `<dl class="aptitudes">${aptitudeNames.map((name, i) => `<div><dt>${name}</dt><dd data-rank="${esc(entry.aptitudes[i] ?? "")}">${esc(entry.aptitudes[i] ?? "—")}</dd></div>`).join("")}</dl>`;
}

function cardHead(entry) {
  return `<div class="card-head"><h2>${esc(horseName(entry))}</h2>
    <div class="score"><span class="data-label">評価点</span><strong>${number(entry.score)}</strong>${entry.rank ? tag(entry.rank, "rank") : ""}</div></div>`;
}

function factors() {
  const reds = [...new Set([
    ...collection(data.plan.factorCoverage).map(row => row.distance),
    ...data.factors.map(entry => entry.factors.red?.name)
  ])].filter(Boolean);
  const parents = collection(data.plan.parentPlans).filter(planGuide);
  return `${heading("因子殿堂")}
    ${factorCoverage()}
    <section class="panel factor-listing">
      ${controls("factors", { queryLabel: "名前・因子・評価点", filterLabel: "赤因子", filters: reds.map(red => [red, red]) })}
      <div id="results">${factorResults()}</div>
    </section>
    <section class="panel section-gap" id="parents" tabindex="-1">
      ${panelTitle("因子馬の育成計画", `<a class="source" href="${href("plan", "factor-training")}">進捗を見る</a>`)}
      ${parents.length ? details(`因子馬の育成案 ${number(parents.length)}件`, listMarkup(parents.map(id => {
        const guide = planGuide(id);
        return `<div class="training-parent-head">
          <a href="${guideHref(id)}">${esc(horseName(guide.subject))}</a>${trainingTag(id)}
        </div><small>${esc(guide.purpose)}</small>`;
      }), "training-hall-plans"), state.part === "parents") : empty("親を作る計画はまだありません。")}
    </section>`;
}

function factorCoverage() {
  const review = collection(data.plan.factorCoverage);
  if (!review.length) return "";
  const pending = collection(data.plan.parentPlans)
    .filter(id => planGuide(id) && !planGuide(id).optional && !trainingResult(id));
  const rows = review.map(row => ({
    ...row,
    count: data.factors.filter(entry => entry.factors.red?.name === row.distance && entry.factors.red?.stars === 3).length,
    planned: pending.filter(id => planGuide(id).distance === row.distance),
  }));
  return `<section class="panel factor-coverage" id="coverage" tabindex="-1">
    ${panelTitle("自前の赤因子★3", `<a class="source" href="${href("plan", "factor-training")}">育成計画を見る</a>`)}
    <dl class="factor-coverage-strip">
      ${rows.map(({ distance, count, planned, priority }) => `<div data-pending="${Boolean(priority && planned.length)}"><dt>${esc(distance)}</dt>
        <dd><strong class="num">${number(count)}</strong> 個体${planned.length ? `<small>計画 ${number(planned.length)}</small>` : ""}</dd></div>`).join("")}
    </dl>
    <p class="factor-coverage-caption">直親は祖父母の因子と出走脚質に合う白まで見て選びます。</p>
    ${details("距離別の使い方と補強先", `
      ${listMarkup(rows.map(row => `<div>
        <strong>${esc(row.distance)}</strong>
        <p>${esc(row.planned.length ? row.need : row.note)}</p>
        ${row.planned.length ? listMarkup(row.planned.map(id =>
          `<a class="source" href="${guideHref(id)}">${esc(horseName(planGuide(id).subject))}の計画</a>`), "factor-coverage-links") : ""}
      </div>`), "factor-coverage-notes")}
      ${data.plan.sources?.compatibility ? `<p class="meta-note"><a class="source" href="${esc(data.plan.sources.compatibility)}">親と祖父母の相性の確認</a></p>` : ""}`, state.part === "coverage")}
  </section>`;
}

function matchesFactor(entry, filter) {
  const { blue, red, unique, use, white, role } = entry.factors;
  if (filter.filter && red?.name !== filter.filter) return false;
  const query = filter.query.normalize("NFKC").trim();
  if (/^\d[\d,]*$/.test(query)) return String(entry.score).includes(query.replaceAll(",", ""));
  return withinQuery(query, entry.name, entry.costume, blue?.name, red?.name, unique?.name, use, factorRole(role),
    collection(white).map(factor => factor.name));
}

function factorResults() {
  const distances = collection(data.plan.factorCoverage).map(row => row.distance);
  const order = entry => {
    const index = distances.indexOf(entry.factors.red?.name);
    return index < 0 ? distances.length : index;
  };
  const entries = data.factors.filter(entry => matchesFactor(entry, state.factors)).sort((left, right) => {
    const starDifference = (right.factors.red?.stars ?? 0) - (left.factors.red?.stars ?? 0);
    return order(left) - order(right) || starDifference || (right.score ?? 0) - (left.score ?? 0);
  });
  return countLabel(entries.length) + (entries.length ? `<div class="factor-grid">${entries.map(factorCard).join("")}</div>` : empty("条件に合う個体はありません。"));
}

function whiteFactorList(whites) {
  return `<dl class="factor-white-list">${[3, 2, 1].map(stars => {
    const names = whites.filter(value => value.stars === stars).map(value => value.name);
    return names.length ? `<div><dt>★${stars}</dt><dd>${esc(names.join("、"))}</dd></div>` : "";
  }).join("")}</dl>`;
}

function factorParents(factors, open) {
  const parents = collection(factors.parents);
  if (parents.length) {
    const lineage = `<ol class="factor-parent-list">${parents.map((node, i) => {
      const recorded = linkedFactor(node)?.factors;
      const whites = collection(recorded?.white);
      return `<li><h3>継承元${i + 1}</h3>${pedigreeNode(node)}
        ${whites.length ? details(`継承元の白因子 ${number(whites.length)}件`, whiteFactorList(whites) +
          (recorded.confidence ? `<p class="meta-note">${esc(recorded.confidence)}</p>` : "")) : ""}</li>`;
    }).join("")}</ol>`;
    return details("継承元", lineage + (factors.parentNote ? `<p class="meta-note">${esc(factors.parentNote)}</p>` : ""), open);
  }
  const family = factors.family;
  return family ? details("継承元", facts([["自前側の親", family.own], ["レンタル側の親", family.rental], ["確認範囲", family.note]]), open)
    : '<p class="meta-note">継承元は未確認です。</p>';
}

function factorRole(role) {
  return { direct: "直親候補", ancestor: "祖父母向け" }[role] || "";
}

function factorCard(entry) {
  const { blue, red, unique, white, use, history, confidence, priorityWhite, memo, role } = entry.factors;
  const whites = collection(white);
  const featured = collection(priorityWhite).map(name => whites.find(value => value.name === name)).filter(Boolean);
  const profile = abilities(entry) + aptitudes(entry) + (history || memo ? facts([
    ["画面メモ", memo], ["育成戦績", history?.results], ["スキルPt", history?.points], ["ファン数", history?.fans], ["登録日", history?.registered]
  ]) : "");
  return `<article class="factor-card" id="entry-${esc(entry.id)}" tabindex="-1">
    <header class="factor-card-heading"><h2>${esc(horseName(entry))}</h2>
      <div class="factor-card-meta"><p class="num">${entry.rank ? `${esc(entry.rank)}　` : ""}評価点 ${number(entry.score)}</p>
        ${factorRole(role) ? tag(factorRole(role), role === "direct" ? "confirmed" : "factor-ancestor") : ""}</div>
    </header>
    <div class="card-body">
      <div class="tags factor-tags">
        ${red ? tag("赤 " + factorLabel(red), "red factor-red-main") : ""}
        ${blue ? tag("青 " + factorLabel(blue), "blue") : ""}
        ${unique ? tag("固有 " + factorLabel(unique), "unique") : ""}
      </div>
      ${use ? `<p class="factor-use">${esc(use)}</p>` : ""}
      ${featured.length ? `<div class="factor-featured"><h3>注目する白因子</h3>
        <div class="tags">${featured.map(value => tag(factorLabel(value), "factor-highlight")).join("")}</div></div>` : ""}
    </div>
    ${whites.length ? details(`白因子 ${number(whites.length)}件`, whiteFactorList(whites) +
      (confidence ? `<p class="meta-note">${esc(confidence)}</p>` : "")) : ""}
    ${factorParents(entry.factors, state.part === entry.id)}
    ${profile ? details("能力・適性・育成記録", profile) : ""}
  </article>`;
}

function race() {
  const options = [...new Set(data.race.map(entry => entry.race.distance))].filter(Boolean);
  return `${heading("レース殿堂", "出走用の個体を見比べ、コースと作戦に合う仕上がりを確認。")}
    <section class="panel">
      ${controls("race", { queryLabel: "名前・衣装・作戦", filterLabel: "担当距離", filters: options.map(distance => [distance, distance]) })}
      <div id="results">${raceResults()}</div>
    </section>
    <section class="panel section-gap">
      ${panelTitle("個体比較")}
      <div id="compare">${compare()}</div>
    </section>`;
}

function raceResults() {
  const filter = state.race;
  const entries = data.race.filter(entry => (!filter.filter || entry.race.distance === filter.filter) &&
    withinQuery(filter.query, entry.name, entry.costume, entry.race.style, entry.race.distance, entry.score));
  return countLabel(entries.length) + (entries.length ? `<div class="race-grid">${entries.map(raceCard).join("")}</div>` : empty("条件に合う個体はありません。"));
}

function raceCard(entry) {
  const record = entry.race;
  const skills = collection(record.skills);
  const detailsMarkup = `
    ${aptitudes(entry)}
    ${record.known ? `<p>${esc(record.known)}</p>` : ""}
    ${skills.length ? listMarkup(skills.map(esc), "skill-list") : empty("習得スキルは未登録です。")}`;

  return `<article class="race-card" id="entry-${esc(entry.id)}">
    ${cardHead(entry)}
    <div class="card-body">
      <div class="tags">${[record.distance, record.style, record.role].filter(Boolean).map(label => tag(label)).join("")}</div>
      ${abilities(entry)}
      ${record.strengths ? `<p><strong>強み</strong>　${esc(record.strengths)}</p>` : ""}
      ${record.focus ? `<p><strong>次の育成</strong>　${esc(record.focus)}</p>` : ""}
      ${record.comparison ? `<p class="muted">${esc(record.comparison)}
        ${data.byId.get(record.previousId)?.factors ? `<a href="${href("factors", record.previousId)}">旧個体の因子</a>` : ""}</p>` : ""}
      ${details(`適性と習得スキル（${skills.length}件）`, detailsMarkup, state.part === entry.id)}
    </div>
  </article>`;
}

function compare() {
  if (data.race.length < 2) return empty("レース殿堂に2個体以上を登録すると比較できます。");
  const picks = state.compare.map(id => data.race.find(entry => entry.id === id));
  const left = picks[0] ?? data.race[0];
  const right = picks[1] && picks[1] !== left ? picks[1] : data.race.find(entry => entry !== left);
  state.compare = [left.id, right.id];
  const labels = ["評価点", ...abilityNames];
  const leftValues = [left.score, ...collection(left.stats)];
  const rightValues = [right.score, ...collection(right.stats)];
  const optionLabel = entry => `${horseName(entry)} ${number(entry.score)}`;

  const selectors = [left, right].map((entry, index) => `<label class="field search">${index === 0 ? "左の個体" : "右の個体"}
    <select data-compare="${index}">${data.race.map(option => `<option value="${esc(option.id)}"${option === entry ? " selected" : ""}>${esc(optionLabel(option))}</option>`).join("")}</select>
  </label>`);

  const rows = labels.map((label, i) => {
    const a = leftValues[i];
    const b = rightValues[i];
    const delta = Number.isFinite(a) && Number.isFinite(b) ? a - b : null;
    const high = Math.max(a || 0, b || 0, 1);
    const bar = (value, alt) => `<span class="num">${number(value)}</span>
      ${Number.isFinite(value) ? `<div class="meter ${alt ? "alt" : ""}" aria-hidden="true"><span style="width:${Math.round(value / high * 100)}%"></span></div>` : ""}`;
    return [label, bar(a, false), bar(b, true), `<span class="delta num">${delta === null ? "—" : (delta > 0 ? "+" : "") + number(delta)}</span>`];
  });

  const aptitudeRows = aptitudeNames.map((name, i) => [name, esc(left.aptitudes?.[i] ?? "—"), esc(right.aptitudes?.[i] ?? "—")]);
  const leftSkills = new Set(collection(left.race.skills));
  const rightSkills = new Set(collection(right.race.skills));
  const skillOnly = (own, other) => {
    const list = [...own].filter(skill => !other.has(skill));
    return list.length ? listMarkup(list.map(esc), "skill-list") : empty("記録上の差分はありません。");
  };
  return `<div class="controls">${selectors.join("")}</div>
    ${table(["項目", "左の個体", "右の個体", "左−右"], rows, "chart compact")}
    <div class="compare-extra">
      ${details("適性を比較", table(["項目", "左の個体", "右の個体"], aptitudeRows, "compact"))}
      ${details("習得スキルの差分", `<h3>${esc(horseName(left))}のみに表示</h3>${skillOnly(leftSkills, rightSkills)}<h3>${esc(horseName(right))}のみに表示</h3>${skillOnly(rightSkills, leftSkills)}`)}
    </div>`;
}

function updates() {
  const items = collection(data.updates.items);
  const timeline = items.map(item => `<li>
    <time datetime="${esc(item.date)}">${esc(dated(item.date))}</time>
    <div><h2>${esc(item.title)}</h2>
      <div class="tags">${tag(item.status, item.status === "確認済み" ? "confirmed" : "plan")}</div>
      <p>${esc(item.note)}</p>
    </div>
  </li>`).join("");
  return `${heading("更新履歴", "追加した記録と、確認できた範囲。")}
    <section class="panel">${timeline ? `<ul class="timeline">${timeline}</ul>` : empty()}</section>
    <section class="panel section-gap">
      ${panelTitle("データのダウンロード")}
      <p>所持一覧はCSV、殿堂馬はJSONで保存できます。</p>
      <div class="actions">
        <a class="button" href="./data/roster.csv" download>育成ウマ娘のCSV</a>
        <a class="button" href="./data/supports.csv" download>サポートカードのCSV</a>
        <a class="button" href="./data/hall.json" download>殿堂馬のJSON</a>
      </div>
    </section>`;
}

const pages = { home, owned, plan, factors, race, updates };

function render(refreshFocus = false) {
  const [requested, part, planId, step] = location.hash.slice(1).split("/");
  state.page = Object.hasOwn(pages, requested) ? requested : "home";
  try {
    state.part = decodeURIComponent(part ?? "");
    state.planId = decodeURIComponent(planId ?? "");
  } catch {
    state.part = "";
    state.planId = "";
  }
  if (state.page === "factors") {
    const entry = data.byId.get(state.part);
    if (entry?.factors && !matchesFactor(entry, state.factors)) {
      state.factors = { query: "", filter: "" };
    }
  }
  const warning = data.issues.length
    ? `<p class="notice status-note" role="status">読み込みを確認するデータ　${esc(data.issues.join("、"))}</p>`
    : "";
  main.innerHTML = warning + pages[state.page]();
  const guide = state.page === "plan" ? planGuide(state.planId) : undefined;
  document.title = `${guide ? horseName(guide.subject) : pageNames[state.page]} | ウマ娘 育成ノート`;
  for (const item of document.querySelectorAll(".navigation [data-page]")) {
    if (item.dataset.page === state.page) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }
  if (refreshFocus) {
    let target;
    const guideSections = { goals: "goals", prep: "parents", parents: "parents", support: "support",
      final: "final", skills: "acquire", route: "rotation", hints: "hints" };
    if (state.page === "plan" && !guide) {
      const isSection = ["factor-training", "race-training"].includes(state.part);
      target = document.getElementById(isSection ? `plan-${state.part}` : `plan-distance-${state.part}`);
    } else if (guide && Object.hasOwn(guideSections, step)) {
      target = document.getElementById(`plan-${guideSections[step]}`);
    } else if (state.page === "factors" && ["parents", "coverage"].includes(state.part)) {
      target = document.getElementById(state.part);
    } else {
      target = document.getElementById(`entry-${state.part}`);
    }
    const focus = (["plan", "factors"].includes(state.page) && target) || main;
    focus.focus({ preventScroll: true });
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  }
}

function changeFilter(event) {
  const input = event.target;
  const key = input.dataset?.filterKey;
  const field = input.dataset?.field;
  if (!key || (field !== "query" && field !== "filter")) return;
  state[key][field] = input.value;
  const listing = key === "factors" ? factorResults() : key === "race" ? raceResults() : ownedResults(key);
  document.querySelector("#results").innerHTML = listing;
}

document.querySelector(".skip").addEventListener("click", event => {
  event.preventDefault();
  main.focus();
});

main.addEventListener("input", event => {
  if (event.target.matches('input[type="search"]')) changeFilter(event);
});

main.addEventListener("change", event => {
  const input = event.target;
  if (input.dataset.filterKey) changeFilter(event);
  if (input.dataset.compare === undefined) return;
  const index = Number(input.dataset.compare);
  const other = 1 - index;
  state.compare[index] = input.value;
  if (state.compare[other] === input.value) {
    state.compare[other] = data.race.find(entry => entry.id !== input.value)?.id ?? "";
  }
  document.querySelector("#compare").innerHTML = compare();
  document.querySelector(`[data-compare="${index}"]`).focus();
});

data = await loadData();
window.addEventListener("hashchange", () => render(true));
render(Boolean(location.hash));
