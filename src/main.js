import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light-border.css";

/* GLOBAL CONSTANT VALUES */
const POS_MEASURE_VERBS = new Set(["Approve", "Yes"]);
const NEG_MEASURE_VERBS = new Set(["Reject", "No"]);
const MEASURE_VERBS = new Set([...POS_MEASURE_VERBS, ...NEG_MEASURE_VERBS]);
const NON_PARTIES = new Set(["Independent", "Nonpartisan"]);
const EXEC_ABBR = new Map(Object.entries({
  // WA State
  "Lt. Governor": "Lieutenant Governor",
  "Sec. of State": "Secretary of State",
  "Atty. General": "Attorney General",
  "Comm. of Pub. Lands": "Commissioner of Public Lands",
  "Sup. of Pub. Instr.": "Superintendent of Public Instruction",
  "Insurance Comm.": "Insurance Commissioner",

  // King County
  "Exec.": "Executive",
  "Dir. of Elec.": "Director of Elections",
  "Prsc. Atty.": "Prosecuting Attorney",

  // Seattle
  "City Atty.": "City Attorney",
}));
const MEASURE_ABBR = new Map(Object.entries({
  "Ref.": "Referendum Measure",
  ESJR: "Engrossed Senate Joint Resolution",
  SJR: "Senate Joint Resolution",
  Charter: "Charter Amendment",
  "Prop.": "Proposition",
  "Init.": "Initiative Measure",
}));
const STRANGER_STATE = { SEPARATE: 1, NONE: 2, COMBINED: 3 }; // Enum
const DIACRITIC_ESCAPE = new Map(Object.entries({
  "m-lorena-gonzález": "m-lorena-gonzalez", // 2017 SCC9
  "rebecca-saldaña": "rebecca-saldana", // 2018 WA Senate 37
}));

const MQ_BREAK_REM_1 = 44;
const MQ_BREAK_REM_2 = 70;
const INFO_TRANS_NORMAL_MS = 75;
const INFO_TRANS_SLOW_MS = INFO_TRANS_NORMAL_MS * 2;
const DIALOG_TRANS_MS = 100;
const doNothing = () => {};

const SEA_TIMES_URLS = new Map([
  ["20171107", "https://www.seattletimes.com/opinion/the-seattle-times-endorsements-for-the-november-7-2017-election/"],
  ["20181106", "https://www.seattletimes.com/opinion/editorials/seattle-times-editorial-board-endorsements-for-nov-6-general-election/"],
  ["20191105", "https://www.seattletimes.com/opinion/editorials/a-cheat-sheet-for-the-nov-5-general-election-the-seattle-times-editorial-boards-endorsements/"],
  ["20201103", "https://www.seattletimes.com/opinion/seattle-times-editorial-board-endorsements-nov-3-general-election/"],
]);
const STRANGER_URLS = new Map([
  ["20171107", "https://www.thestranger.com/features/2017/10/11/25459963/the-strangers-endorsements-for-the-november-7-2017-general-election"],
  ["20181106", "https://www.thestranger.com/features/2018/10/10/33619203/the-strangers-endorsements-for-the-november-6-2018-general-election"],
  ["20191105", "https://www.thestranger.com/news/2019/10/09/41625578/the-strangers-endorsements-for-the-november-5-2019-general-election"],
  ["20201103", "https://www.thestranger.com/news/2020/10/14/47141697/the-strangers-endorsements-for-the-november-2020-general-election"],
]);

const STATE_PAMPHLETS_URL = "https://www.sos.wa.gov/elections/research/election-results-and-voters-pamphlets.aspx";
const COUNTY_PAMPHLETS_URL = "https://www.kingcounty.gov/depts/elections/how-to-vote/voters-pamphlet.aspx";

/* PURE FUNCTIONS */
// "Senate 5" -> "5"
function findSingleNumber(string) {
  return string.match(/\d+/)[0];
}
function expandExecutive(executive) {
  return EXEC_ABBR.get(executive) ?? executive;
}
function expandMeasure(measure) {
  const [mType, mNum] = measure.split(" "); // Assumes only one space
  return `${MEASURE_ABBR.get(mType)} No.\u00A0${mNum}`;
}
// Actual words -> actual-words
function fullToKebab(fullText) {
  return (
    fullText
      .replace(/[.'\u2019]/g, "") // periods and apostrophes
      .replace(/ /g, "-")
      .toLowerCase()
  );
}
// camelCase -> camel-case
function camelToKebab(camel) {
  return camel.replace(/[A-Z]/g, "-$&").toLowerCase();
}
function newTextContent(elemType, text) {
  const newElem = document.createElement(elemType);
  newElem.textContent = text;
  return newElem;
}
/* https://stackoverflow.com/a/42860948 */
function completelyScrolledDown(elem) {
  return (
    elem.scrollHeight // Total content height
    - elem.scrollTop // Distance from top
    - elem.clientHeight // Visible height
  ) < 1; // 1 accounts for borders, scroll bars, floating pixel count
}

/* LOCAL SIDE EFFECTS */
class QuerySelector {
  constructor(prefix) {
    this.prefix = prefix;
    this.elems = new Map();
    this.wrapper = document.querySelector(`.${this.prefix}.wrapper`);
  }

  getElem(suffix) {
    if (suffix === "wrapper") {
      return this.wrapper;
    }
    const selector = `.${suffix}`;
    let elem;
    if (this.elems.has(selector)) {
      elem = this.elems.get(selector);
    } else {
      elem = this.wrapper.querySelector(selector);
      this.elems.set(selector, elem);
    }
    return elem;
  }

  // getElemAttribute(suffix, attr) {
  //   return this.getElem(suffix)[attr];
  // }

  // setElemAttribute(suffix, attr, value) {
  //   this.getElem(suffix)[attr] = value;
  // }

  getElemText(suffix) {
    return this.getElem(suffix).textContent;
  }

  setElemText(suffix, text) {
    this.getElem(suffix).textContent = text;
  }

  addElemClass(suffix, ...clsNames) {
    this.getElem(suffix).classList.add(...clsNames);
  }

  removeElemClass(suffix, ...clsNames) {
    this.getElem(suffix).classList.remove(...clsNames);
  }

  toggleElemClass(suffix, clsName, state = null) {
    if (state !== null) {
      this.getElem(suffix).classList.toggle(clsName, state);
    } else {
      this.getElem(suffix).classList.toggle(clsName);
    }
  }

  elemHasClass(suffix, clsName) {
    return this.getElem(suffix).classList.contains(clsName);
  }

  hasDisplayNone() {
    return this.elemHasClass("wrapper", "--display-none");
  }

  clickBar() {
    this.getElem("bar").click();
  }

  collapseInfo(collapse = true) {
    this.toggleElemClass("wrapper", "wrapper--open", !collapse);
    this.toggleElemClass("info", "info--collapsed", collapse);
    this.toggleElemClass(
      "bar__expand-icon", "bar__expand-icon--open", !collapse
    );
  }

  infoIsOpen() {
    return !(
      this.elemHasClass("info", "info--collapsed") || this.hasDisplayNone()
    );
  }
}
function removeChildParagraphs(parent) {
  while (parent.lastElementChild.nodeName === "P") {
    parent.lastElementChild.remove();
  }
}

// Snowpack's Webpack plugin strips async/defer, so we need this instead
// @snowpack/plugin-webpack 2.3.0
// Fixed in PR#2498, now waiting on npm
// https://github.com/snowpackjs/snowpack/pull/2498
window.addEventListener("DOMContentLoaded", () => {
  /* GLOBAL ELEMENTS */
  const electionSelect = document.querySelector("#election-select");

  const tableWrapper = document.querySelector(".table-wrapper");
  const tableSeaTimesLink = tableWrapper.querySelector(".table__seatimes-link");
  const tableStrangerLink = tableWrapper.querySelector(".table__stranger-link");
  const tableBody = tableWrapper.querySelector("tbody");
  const tableEndPadding = tableBody.querySelector(".table__end-padding");

  const raceClass = new QuerySelector("race");
  const seaTimesClass = new QuerySelector("seatimes");
  const strangerClass = new QuerySelector("stranger");
  const allThree = [raceClass, seaTimesClass, strangerClass];

  const infoWrapper = document.querySelector(".info-wrapper");
  const urlNouns = infoWrapper.querySelectorAll(".endorsement-links__noun");
  const pamphletUrls = infoWrapper.querySelectorAll(".pamphlet__warning__url");

  const rowUpBtn = document.querySelector("#row-up-button");
  const rowDownBtn = document.querySelector("#row-down-button");
  const rowCloseBtn = document.querySelector("#row-close-button");

  const loadingOverlay = document.querySelector(".loading-overlay");

  const footerButtonBox = document.querySelector(".footer__button-box");

  /* GLOBAL VARIABLES */
  let pamphletProfiles;
  let endorsementUrls;
  let measuresData;

  const portraits = new Map();
  const portraitDelay = new Map([
    [seaTimesClass, doNothing],
    [strangerClass, doNothing],
  ]);

  /* GLOBAL PROPERTIES */
  let lastSectionClicked = raceClass;
  let firstRow;
  let lastRow;

  const BODY_FONTSIZE_PX = parseFloat(
    // parseFloat discards trailing 'px'
    getComputedStyle(document.documentElement).fontSize
  );
  function remToPx(rem) {
    return rem * BODY_FONTSIZE_PX;
  }
  const BODY_MARGIN_PX = remToPx(0.5);
  const MQ_BREAK_PX_1 = remToPx(MQ_BREAK_REM_1);
  const MQ_BREAK_PX_2 = remToPx(MQ_BREAK_REM_2);
  function smallScreenLayout() {
    return window.innerWidth <= MQ_BREAK_PX_1;
  }
  function mediumWidthLayout() {
    return (
      window.innerWidth > MQ_BREAK_PX_1 && window.innerWidth <= MQ_BREAK_PX_2
    );
  }
  function wideScreenLayout() {
    return window.innerWidth > MQ_BREAK_PX_2;
  }
  function electionCertified() {
    return electionSelect.selectedOptions[0].hasAttribute("data-certified");
  }
  function measureIsSelected() {
    return infoWrapper.classList.contains("info-wrapper--measure");
  }
  function numInfoSectionsOpen() {
    return allThree.filter(s => s.infoIsOpen()).length;
  }
  function currentSelectedRow() {
    return tableBody.querySelector("tr.table__row--selected");
  }
  function bodyScrollDisabled() {
    return document.body.classList.contains("scroll-disabled");
  }

  /* GLOBAL SIDE EFFECTS */
  function displayRaceSections(...sectionNames) {
    const notVisible = sectionNames.filter(
      sN => raceClass.elemHasClass(sN, "--display-none")
    );
    // Assumes that no valid section configuration is a subset of
    // another valid config
    if (notVisible.length) {
      for (const section of raceClass.getElem("info .sections").children) {
        section.classList.toggle("--display-none", true);
      }
      for (const section of sectionNames) {
        raceClass.toggleElemClass(section, "--display-none", false);
      }
    }
  }
  function displayMeasureInfo(mainLevel, measure) {
    displayRaceSections("measure");
    const [measureType, measureNumber] = (
      expandMeasure(measure).split(" No.\u00A0")
    );
    raceClass.setElemText("measure__type", measureType);
    raceClass.setElemText("measure__num", measureNumber);
    raceClass.setElemText(
      "measure__title", measuresData[mainLevel][measure].title
    );
    removeChildParagraphs(raceClass.getElem("measure"));
    for (const paraText of measuresData[mainLevel][measure].text) {
      const para = newTextContent("p", paraText);
      raceClass.getElem("measure").append(para);
    }
  }

  function displayFederalRace(subLevel, race) {
    let fullRace;
    switch (subLevel) {
      case "executive":
        displayRaceSections("president");
        fullRace = "President of the United States of America";
        break;

      case "congress":
        if (race.startsWith("Senate")) {
          displayRaceSections("congress", "us-senator");
          fullRace = "US Senator for WA\u00A0State";
        } else if (race.startsWith("Rep")) {
          displayRaceSections("congress", "us-representative");
          fullRace = `US Representative for Congressional\u00A0District\u00A0${findSingleNumber(race)}`;
        }
        break;

      default:
        throw Error("Unknown subevel");
        // break;
    }
    raceClass.setElemText("bar__full-race", fullRace);
  }
  function displayWaStateRace(subLevel, race) {
    let fullRace;
    switch (subLevel) {
      case "executive":
        displayRaceSections(fullToKebab(race));
        fullRace = expandExecutive(race);
        break;

      case "legislature":
        if (race.startsWith("Senate")) {
          displayRaceSections("legislature", "state-senator");
          fullRace = `State Senator for Legislative\u00A0District\u00A0${findSingleNumber(race)}`;
        } else if (race.startsWith("Rep")) {
          displayRaceSections("legislature", "state-representative");
          const [dist, pos] = race.match(/\d+/g);
          fullRace = `State Representative for Legislative\u00A0District\u00A0${dist}, Position\u00A0${pos}`;
        }
        break;

      case "judiciary":
        if (race.startsWith("Supreme")) {
          displayRaceSections("judges", "state-supreme-court-justice");
          fullRace = `State Supreme Court Justice, Position\u00A0${findSingleNumber(race)}`;
        } else if (race.startsWith("Appeals")) {
          displayRaceSections("judges", "court-of-appeals-judge");
          const [div, dist, pos] = race.match(/\d+/g);
          fullRace = `Court of Appeals Judge, Division\u00A0${div}, District\u00A0${dist}, Position\u00A0${pos}`;
        }
        break;

      case "measures":
        displayMeasureInfo("WA State", race);
        fullRace = expandMeasure(race);
        break;
      default:
        throw Error("Unknown subevel");
        // break;
    }
    raceClass.setElemText("bar__full-race", `WA ${fullRace}`);
  }
  function displayKingCountyRace(subLevel, race) {
    let fullRace;
    switch (subLevel) {
      case "executive":
        displayRaceSections(`king-county-${fullToKebab(race)}`);
        fullRace = `King County ${expandExecutive(race)}`;
        break;

      case "county-council":
        displayRaceSections("king-county-council");
        fullRace = `Metropolitan King County Council, Council\u00A0District\u00A0No.\u00A0${findSingleNumber(race)}`;
        break;

      case "judiciary":
        if (race.startsWith("Superior")) {
          displayRaceSections("judges", "superior-court-judge");
          fullRace = `King County Superior Court Judge, Position\u00A0${findSingleNumber(race)}`;
        } else {
          displayRaceSections("judges", "district-court-judge");
          const [dist, pos] = race.split(" ");
          fullRace = `${dist} Electoral District Court Judge, Position\u00A0${pos}`;
        }
        break;

      case "measures":
        displayMeasureInfo("King County", race);
        fullRace = `King County ${expandMeasure(race)}`;
        break;

      case "port-of-seattle":
        displayRaceSections("port-commissioner");
        fullRace = `Port of Seattle Commissioner, Position\u00A0No.\u00A0${findSingleNumber(race)}`;
        break;

      default:
        throw Error("Unknown subevel");
        // break;
    }
    raceClass.setElemText("bar__full-race", fullRace);
  }
  function displaySeattleRace(subLevel, race) {
    let fullRace;
    switch (subLevel) {
      case "executive":
        displayRaceSections(fullToKebab(race));
        fullRace = `Seattle ${expandExecutive(race)}`;
        break;

      case "city-council":
        displayRaceSections("city-council");
        fullRace = `Seattle City Council, Council\u00A0District\u00A0No.\u00A0${findSingleNumber(race)}`;
        break;

      case "schools":
        displayRaceSections("school-district-director");
        fullRace = `Seattle Public Schools Board of Directors, Director\u00A0District\u00A0No.\u00A0${findSingleNumber(race)}`;
        break;

      case "measures":
        displayMeasureInfo("Seattle", race);
        fullRace = `City of Seattle ${expandMeasure(race)}`;
        break;

      default:
        throw Error("Unknown subevel");
        // break;
    }
    raceClass.setElemText("bar__full-race", fullRace);
  }

  function setMeasureWords(isMeasure) {
    raceClass.setElemText("bar__preposition", isMeasure ? "On" : "For");
    let verb;
    if (electionCertified()) {
      verb = isMeasure ? "recommended" : "endorsed";
    } else {
      verb = isMeasure ? "recommends" : "endorses";
    }
    seaTimesClass.setElemText("bar__verb", verb);
    strangerClass.setElemText("bar__verb", verb);
    for (const noun of urlNouns) {
      noun.textContent = isMeasure ? "recommendation" : "endorsement";
    }
  }
  function setCombinedEndorsement(isCombined) {
    seaTimesClass.toggleElemClass("bar__concur", "--display-none", !isCombined);
    if (isCombined) {
      seaTimesClass.setElemText(
        "bar__verb", seaTimesClass.getElemText("bar__verb").replace(/s$/, "")
        // Strip ending s from present tense singular verb (endorses -> endorse)
      );
    }
    seaTimesClass.toggleElemClass(
      "endorsement-links", "endorsement-links--combined", isCombined
    );
    seaTimesClass.toggleElemClass(
      "endorsement-links__secondary", "--display-none", !isCombined
    );
  }
  function setPamphletUrls(url) {
    for (const urlElem of pamphletUrls) {
      urlElem.href = url;
    }
  }

  async function fetchPortrait(name) {
    let kebabName = fullToKebab(name);
    kebabName = DIACRITIC_ESCAPE.get(kebabName) ?? kebabName;

    let url;
    if (portraits.has(kebabName)) {
      url = portraits.get(kebabName);
    } else {
      const blob = await (
        fetch(`data/${electionSelect.value}/portraits/${kebabName}-min.jpg`)
          .then(resp => resp.blob())
      );
      url = URL.createObjectURL(blob);
      portraits.set(kebabName, url);
    }
    return url;
  }
  async function displayPamphletCounty(querySelector, name) {
    setPamphletUrls(COUNTY_PAMPHLETS_URL);

    const pamphletContent = pamphletProfiles[name];
    const img = querySelector.getElem("pamphlet__portrait-img");
    img.src = "images/blank.svg";

    let portraitPromise;
    if (!querySelector.elemHasClass("info", "info--collapsed")) {
      portraitPromise = fetchPortrait(name);
    } else {
      portraitDelay.set(querySelector, async () => {
        img.src = await fetchPortrait(name);
        portraitDelay.set(querySelector, doNothing);
      });
    }

    querySelector.toggleElemClass(
      "pamphlet__education-section",
      "--display-none",
      !("education" in pamphletContent),
    );
    querySelector.toggleElemClass(
      "pamphlet__occupation-section",
      "--display-none",
      !("occupation" in pamphletContent),
    );

    // eslint-disable-next-line prefer-const
    for (let [pHeader, pText] of Object.entries(pamphletContent)) {
      pHeader = camelToKebab(pHeader);
      if (pHeader === "statement") {
        const statementSection = querySelector.getElem(
          "pamphlet__statement-section"
        );
        removeChildParagraphs(statementSection);
        for (const para of pText) {
          const paraElem = document.createElement("p");
          paraElem.innerHTML = para;
          statementSection.append(paraElem);
        }
      } else {
        querySelector.getElem(`pamphlet__${pHeader}`).innerHTML = pText;
      }
    }
    if (portraitPromise) {
      img.src = await portraitPromise;
    }
  }
  async function displayPamphletState(querySelector, name) {
    setPamphletUrls(STATE_PAMPHLETS_URL);

    const pamphletContent = pamphletProfiles[name];
    const img = querySelector.getElem("pamphlet__portrait-img");
    img.src = "images/blank.svg";

    let portraitPromise;
    if (!querySelector.elemHasClass("info", "info--collapsed")) {
      portraitPromise = fetchPortrait(name);
    } else {
      portraitDelay.set(querySelector, async () => {
        img.src = await fetchPortrait(name);
        portraitDelay.set(querySelector, doNothing); // Remove self when done
      }); // If collapsed, save for later
    }

    // eslint-disable-next-line prefer-const
    for (let [pHeader, pText] of Object.entries(pamphletContent)) {
      pHeader = camelToKebab(pHeader);
      if (pHeader === "party-pref") {
        querySelector.setElemText(
          "pamphlet__party-pref",
          `(${!NON_PARTIES.has(pText) ? "Prefers " : ""}${pText})`
        );
      } else if (pHeader === "statement") {
        const statementSection = querySelector.getElem(
          "pamphlet__statement-section"
        );
        removeChildParagraphs(statementSection);
        for (const para of pText) {
          const paraElem = document.createElement("p");
          paraElem.innerHTML = para;
          statementSection.append(paraElem);
        }
      } else {
        querySelector.getElem(`pamphlet__${pHeader}`).innerHTML = pText;
      }
    }
    if (portraitPromise) {
      img.src = await portraitPromise;
    }
  }
  async function displayPamphletPresident(querySelector, name) {
    const pamphletContent = pamphletProfiles[name];
    const img = querySelector.getElem("pamphlet__portrait-img");
    const vpImg = querySelector.getElem("pamphlet__vp__portrait-img");
    const pFirst = pamphletContent.president.firstName;
    const pLast = pamphletContent.president.lastName;
    const vpFirst = pamphletContent.vicePresident.firstName;
    const vpLast = pamphletContent.vicePresident.lastName;

    img.src = "images/blank.svg";
    vpImg.src = "images/blank.svg";
    let portraitPromise;
    let vpPortraitPromise;
    if (!querySelector.elemHasClass("info", "collapsed")) {
      portraitPromise = fetchPortrait(`${pFirst} ${pLast}`);
      vpPortraitPromise = fetchPortrait(`${vpFirst} ${vpLast}`);
    } else {
      portraitDelay.set(querySelector, async () => {
        img.src = await fetchPortrait(`${pFirst} ${pLast}`);
        vpImg.src = await fetchPortrait(`${vpFirst} ${vpLast}`);
        portraitDelay.set(querySelector, doNothing);
      });
    }

    // eslint-disable-next-line prefer-const
    for (let [pHeader, pText] of Object.entries(pamphletContent.president)) {
      pHeader = camelToKebab(pHeader);
      querySelector.getElem(`pamphlet__${pHeader}`).innerHTML = pText;
    }
    // eslint-disable-next-line prefer-const
    for (let [pHeader, pText] of Object.entries(pamphletContent.vicePresident)) {
      pHeader = `vp__${camelToKebab(pHeader)}`;
      querySelector.getElem(`pamphlet__${pHeader}`).innerHTML = pText;
    }

    querySelector.setElemText(
      "pamphlet__party-pref", `${pamphletContent.partyPref} Nominee`
    );
    querySelector.setElemText(
      "pamphlet__vp__party-pref", `${pamphletContent.partyPref} Nominee`
    );
    const statementSection = querySelector.getElem("pamphlet__statement-section");
    removeChildParagraphs(statementSection);
    for (const para of pamphletContent.statement) {
      const paraElem = document.createElement("p");
      paraElem.innerHTML = para;
      statementSection.append(paraElem);
    }
    querySelector.getElem("pamphlet__contact").innerHTML = (
      pamphletContent.contact
    );
    if (portraitPromise) {
      img.src = await portraitPromise;
      vpImg.src = await vpPortraitPromise;
    }
  }
  function displayPamphlet(mainLevel, subLevel, race, querySelector, name) {
    const presidentalRace = (
      mainLevel === "federal" && subLevel === "executive"
    );
    querySelector.toggleElemClass(
      "pamphlet__vp__header", "--display-none", !presidentalRace,
    );
    querySelector.toggleElemClass(
      "pamphlet__president-position", "--display-none", !presidentalRace,
    );

    const statePamphlet = (
      mainLevel === "federal"
      || mainLevel === "wa-state"
      || (
        mainLevel === "king-county"
        && subLevel === "judiciary"
        && race.startsWith("Superior")
      )
    );
    const countyPamphlet = (
      (mainLevel === "king-county" && subLevel !== "judiciary")
      || (
        mainLevel === "king-county"
        && subLevel === "judiciary"
        && !race.startsWith("Superior")
      )
      || mainLevel === "seattle"
    );
    // Superior judges use state pamphlet
    // District judges use county pamphlet

    querySelector.toggleElemClass("pamphlet", "pamphlet--state", statePamphlet);
    querySelector.toggleElemClass("pamphlet", "pamphlet--county", countyPamphlet);

    querySelector.toggleElemClass(
      "pamphlet__education-section", "--display-none", !statePamphlet
    ); // Always used in state pamphlet, sometimes in county

    querySelector.toggleElemClass(
      "pamphlet__occupation-section", "--display-none", !countyPamphlet
    ); // Not used in state pamphlet, sometimes in county

    if (presidentalRace) {
      displayPamphletPresident(querySelector, name);
    } else if (statePamphlet) {
      displayPamphletState(querySelector, name);
    } else if (countyPamphlet) {
      displayPamphletCounty(querySelector, name);
    }
  }

  function displayRowInfo(tableRow) {
    const [mainLevel, subLevel] = tableRow.classList;
    const [raceCell, seaTimesCell, strangerCell] = tableRow.cells;
    const raceText = raceCell.textContent;
    const seaTimesText = seaTimesCell.textContent;
    const seaTimesUrl = endorsementUrls[mainLevel][raceText].seattletimes;

    const strangerText = strangerCell?.textContent;
    let strangerState;
    if (strangerText) {
      strangerState = STRANGER_STATE.SEPARATE;
    } else if (strangerText === "") {
      strangerState = STRANGER_STATE.NONE;
    } else if (strangerText === undefined) {
      strangerState = STRANGER_STATE.COMBINED;
    }
    // Text: Separate endorsements
    // Empty string: No endorsement
    // undefined: Combined endorsement

    const strangerUrl = endorsementUrls[mainLevel][raceText].stranger;
    // Undefined if DNE

    switch (mainLevel) {
      case "federal":
        displayFederalRace(subLevel, raceText);
        break;
      case "wa-state":
        displayWaStateRace(subLevel, raceText);
        break;
      case "king-county":
        displayKingCountyRace(subLevel, raceText);
        break;
      case "seattle":
        displaySeattleRace(subLevel, raceText);
        break;
      default:
        throw Error("Unknown main level");
        // break;
    }

    const isMeasure = subLevel === "measures";
    setMeasureWords(isMeasure);
    infoWrapper.classList.toggle("info-wrapper--measure", isMeasure);

    const singleEndorse = (
      !seaTimesText || (strangerState !== STRANGER_STATE.SEPARATE)
    );
    infoWrapper.classList.toggle("info-wrapper--single", singleEndorse);
    infoWrapper.classList.toggle("info-wrapper--double", !singleEndorse);

    const doubleHead = raceText === "President";
    const expType = subLevel === "judiciary" ? "Legal/Judicial" : "Elected";

    seaTimesClass.toggleElemClass("wrapper", "--display-none", !seaTimesText);
    if (seaTimesUrl) {
      seaTimesClass.toggleElemClass(
        "pamphlet__headers", "pamphlet__headers--double", doubleHead
      );
      seaTimesClass.toggleElemClass(
        "pamphlet__headers", "pamphlet__headers--single", !doubleHead
      );
      seaTimesClass.getElem("bar").className = (
        ["bar", ...seaTimesCell.classList].join(" ")
      );
      seaTimesClass.setElemText("bar__endorse", seaTimesText);
      seaTimesClass.getElem("endorsement-links__primary").href = seaTimesUrl;
      seaTimesClass.toggleElemClass("pamphlet", "--display-none", isMeasure);
      seaTimesClass.setElemText("pamphlet__exp-type", expType);
      if (subLevel !== "measures") {
        displayPamphlet(
          mainLevel, subLevel, raceText, seaTimesClass, seaTimesText
        );
      } else {
        portraitDelay.set(seaTimesClass, doNothing);
      }
    }

    strangerClass.toggleElemClass(
      "wrapper", "--display-none", strangerState !== STRANGER_STATE.SEPARATE
    );
    setCombinedEndorsement(strangerState === STRANGER_STATE.COMBINED);
    if (strangerState === STRANGER_STATE.COMBINED) {
      seaTimesClass.getElem("endorsement-links__secondary").href = (
        strangerUrl
      );
    } else if (strangerState === STRANGER_STATE.SEPARATE) {
      strangerClass.toggleElemClass(
        "pamphlet__headers", "pamphlet__headers--double", doubleHead
      );
      strangerClass.toggleElemClass(
        "pamphlet__headers", "pamphlet__headers--single", !doubleHead
      );
      strangerClass.getElem("bar").className = (
        ["bar", ...strangerCell.classList].join(" ")
      );
      strangerClass.setElemText("bar__endorse", strangerText);
      strangerClass.getElem("endorsement-links__primary").href = strangerUrl;
      strangerClass.toggleElemClass("pamphlet", "--display-none", isMeasure);
      strangerClass.setElemText("pamphlet__exp-type", expType);
      if (subLevel !== "measures") {
        displayPamphlet(
          mainLevel, subLevel, raceText, strangerClass, strangerText
        );
      } else {
        portraitDelay.set(strangerClass, doNothing);
      }
    }
  }

  function toggleInfoOffscreen(offscreen = null) {
    if (offscreen === null) {
      infoWrapper.classList.toggle("--offscreen");
      rowUpBtn.classList.toggle("--offscreen");
      rowDownBtn.classList.toggle("--offscreen");
      rowCloseBtn.classList.toggle("--offscreen");
    } else {
      infoWrapper.classList.toggle("--offscreen", offscreen);
      rowUpBtn.classList.toggle("--offscreen", offscreen);
      rowDownBtn.classList.toggle("--offscreen", offscreen);
      rowCloseBtn.classList.toggle("--offscreen", offscreen);
    }
  }

  function normalizeElemHeight(suffix) {
    seaTimesClass.getElem(suffix).style.height = null;
    strangerClass.getElem(suffix).style.height = null;
    if (wideScreenLayout()
        && infoWrapper.classList.contains("info-wrapper--double")) {
      const maxHeight = Math.max(
        seaTimesClass.getElem(suffix).offsetHeight,
        strangerClass.getElem(suffix).offsetHeight,
      );
      seaTimesClass.getElem(suffix).style.height = `${maxHeight}px`;
      strangerClass.getElem(suffix).style.height = `${maxHeight}px`;
    }
  }
  function normalizeBarAndBlurb() {
    const eitherCollapsed = (
      !seaTimesClass.infoIsOpen() || !strangerClass.infoIsOpen()
    );
    normalizeElemHeight("bar");
    if (!eitherCollapsed) {
      normalizeElemHeight("endorsement-links");
    } else {
      seaTimesClass.getElem("endorsement-links").style.height = null;
      strangerClass.getElem("endorsement-links").style.height = null;
    }
  }

  /* https://css-tricks.com/prevent-page-scrolling-when-a-modal-is-open/ */
  // For small screen layout only
  function disableBodyScroll() {
    const scrollY = document.documentElement.style
      .getPropertyValue("--scroll-y");
    document.body.style.top = `-${scrollY}`;
    document.body.classList.toggle("scroll-disabled", true);
  }
  function enableBodyScroll() {
    const scrollY = document.body.style.top;
    document.body.style.top = "";
    const scrollTarget = (
      parseInt(scrollY ?? "0", 10) * -1
      + Number(document.body.dataset.smallscreenOffset)
    );
    window.scrollTo(0, scrollTarget);
    document.body.classList.toggle("scroll-disabled", false);
    document.body.dataset.smallscreenOffset = "0";
  }

  function collapseOtherInfoSections(querySelector, collapse = true) {
    for (const selector of allThree.filter(s => s !== querySelector)) {
      if (selector.infoIsOpen()) {
        selector.collapseInfo(collapse);
      }
    }
  }
  function reClickLast() {
    if (!lastSectionClicked.hasDisplayNone()) {
      lastSectionClicked.clickBar();
    } else {
      const last = lastSectionClicked;
      if (!seaTimesClass.hasDisplayNone()) {
        seaTimesClass.clickBar();
      } else if (!strangerClass.hasDisplayNone()) {
        strangerClass.clickBar();
      }
      lastSectionClicked = last;
    }
  }
  function selectRow(targetRow, offscreen = false) {
    const selectedRow = currentSelectedRow();
    if (targetRow === selectedRow) {
      if (smallScreenLayout()) {
        disableBodyScroll();
        toggleInfoOffscreen(false);
      }
      return;
    }
    if (selectedRow !== null) {
      selectedRow.classList.remove("table__row--selected");
      // For first click when initializing
    }
    targetRow.classList.add("table__row--selected");

    for (const selector of allThree) {
      selector.toggleElemClass("info", "info--slow-speed", true);
      selector.toggleElemClass("info", "info--row-change", true);
    }
    // Selecting a row needs a slowdown compared to opening a section* (??)

    displayRowInfo(targetRow);

    /*
    (Measure is selected on any size) or widescreen: No conditions
    Medium width: Race info and either ST/Stranger section open
    Smallscreen: Only one section open at a time

    If more sections are opened than allowed,
    keep the section last opened by the user open if possible

    If less sections are opened than optimal,
    open the section last opened by the user if possible
    */
    if (!wideScreenLayout() && !measureIsSelected()) {
      const numOpen = numInfoSectionsOpen();
      if (numOpen === 0) {
        reClickLast();
      } else if (numOpen === 1 && mediumWidthLayout()) {
        const last = lastSectionClicked;
        if (raceClass.infoIsOpen()) {
          if (!seaTimesClass.hasDisplayNone()) {
            seaTimesClass.clickBar();
          } else if (!strangerClass.hasDisplayNone()) {
            strangerClass.clickBar();
          }
          // Want to have one endorsement section open
        }
        lastSectionClicked = last;
        // Need to click instead of collapse to trigger portrait load
      } else if (numOpen > 1 && smallScreenLayout()) {
        if (!lastSectionClicked.hasDisplayNone()) {
          collapseOtherInfoSections(lastSectionClicked);
        } else {
          // Race info is never hidden,
          // so lastClicked must be ST/Stranger with the other one hidden
          raceClass.collapseInfo();
        }
      } else if (numOpen > 1 && mediumWidthLayout()) {
        if (seaTimesClass.infoIsOpen() && strangerClass.infoIsOpen()) {
          if (lastSectionClicked === strangerClass) {
            seaTimesClass.collapseInfo();
          } else {
            strangerClass.collapseInfo();
          }
        }
      }
    }
    if (measureIsSelected()) {
      for (const selector of allThree) {
        if (!selector.hasDisplayNone()) {
          selector.collapseInfo(false);
        }
      }
      raceClass.getElem("wrapper").style.flexShrink = null;
      seaTimesClass.getElem("wrapper").style.flexShrink = 0;
      strangerClass.getElem("wrapper").style.flexShrink = 0;
      // Scroll measure info, not endorsement urls
    } else {
      const raceFlex = smallScreenLayout() ? null : 0;
      raceClass.getElem("wrapper").style.flexShrink = raceFlex;
      seaTimesClass.getElem("wrapper").style.flexShrink = null;
      strangerClass.getElem("wrapper").style.flexShrink = null;
      // Scroll candidate info, not race info
    }

    toggleInfoOffscreen(offscreen);
    normalizeBarAndBlurb();
    for (const selector of allThree) {
      selector.getElem("info").scrollTop = 0;
    }
    if (smallScreenLayout() && !offscreen) {
      disableBodyScroll();
    }

    for (const selector of allThree) {
      selector.toggleElemClass("info", "info--row-change", false);
    }
    setTimeout(() => {
      for (const selector of allThree) {
        selector.toggleElemClass("info", "info--slow-speed", false);
      }
    }, INFO_TRANS_SLOW_MS);
  }
  function scrollRowIntoView(row) {
    const bound = row.getBoundingClientRect();
    if (bound.top < 0) {
      // Above viewport
      row.scrollIntoView();
    } else if (bound.bottom > window.innerHeight) {
      // Below viewport
      row.scrollIntoView(false);
    }
  }
  function selectPreviousRow() {
    const selectedRow = currentSelectedRow();
    if (selectedRow === firstRow) {
      return;
    }

    let prevSibling = selectedRow.previousElementSibling;
    let dY = prevSibling.offsetHeight;
    while ((prevSibling !== firstRow) && !prevSibling.classList.length) {
      // Header rows have no classes
      prevSibling = prevSibling.previousElementSibling;
      dY += prevSibling.offsetHeight;
    }
    selectRow(prevSibling, false);
    if (smallScreenLayout()) {
      const offset = document.body.dataset.smallscreenOffset;
      document.body.dataset.smallscreenOffset = Number(offset) - dY;
      // Modifying document.body.style.top doesn't work while body scrolling
      // disabled, need to store offset elsewhere
    } else {
      scrollRowIntoView(prevSibling);
    }
  }
  function selectNextRow() {
    const selectedRow = currentSelectedRow();
    if (selectedRow === lastRow) {
      return;
    }

    let nextSibling = selectedRow.nextElementSibling;
    let dY = nextSibling.offsetHeight;
    while ((nextSibling !== lastRow) && !nextSibling.classList.length) {
      nextSibling = nextSibling.nextElementSibling;
      dY += nextSibling.offsetHeight;
    }
    selectRow(nextSibling, false);
    if (smallScreenLayout()) {
      const offset = document.body.dataset.smallscreenOffset;
      document.body.dataset.smallscreenOffset = Number(offset) + dY;
    } else {
      scrollRowIntoView(nextSibling);
    }
  }

  function newEndorsementRow(race, info) {
    const tableRow = document.createElement("tr");
    tableRow.append(newTextContent("td", race));
    const seaTimesCell = document.createElement("td");
    seaTimesCell.append(document.createElement("p"));

    const seaTimesEndorse = info.seattleTimes;
    seaTimesCell.children[0].textContent = seaTimesEndorse;
    if (seaTimesEndorse) {
      if (!MEASURE_VERBS.has(seaTimesEndorse)) {
        seaTimesCell.classList.add(
          `--${fullToKebab(pamphletProfiles[seaTimesEndorse].partyPref)}`
        );
        // seaTimesCell.classList.add("--nonpartisan");
        // For testing
      } else {
        seaTimesCell.classList.add("--measure");
        seaTimesCell.classList.add(
          POS_MEASURE_VERBS.has(seaTimesEndorse) ? "--positive" : "--negative",
        );
      }
    }

    if (info.incumbent === seaTimesEndorse) {
      seaTimesCell.classList.add("--incumbent");
    }
    if (electionCertified() && info.result === seaTimesEndorse) {
      seaTimesCell.classList.add("--winner");
    }
    tableRow.append(seaTimesCell);

    const strangerEndorse = info.stranger;
    if (seaTimesEndorse !== strangerEndorse) {
      const strangerCell = document.createElement("td");
      strangerCell.append(document.createElement("p"));
      strangerCell.children[0].textContent = strangerEndorse;
      if (strangerEndorse) {
        if (!MEASURE_VERBS.has(strangerEndorse)) {
          strangerCell.classList.add(
            `--${fullToKebab(pamphletProfiles[strangerEndorse].partyPref)}`
          );
          // strangerCell.classList.add("--nonpartisan");
        } else {
          strangerCell.classList.add("--measure");
          strangerCell.classList.add(
            POS_MEASURE_VERBS.has(strangerEndorse) ? "--positive" : "--negative",
          );
        }
      }

      if (info.incumbent === strangerEndorse) {
        strangerCell.classList.add("--incumbent");
      }
      if (electionCertified() && info.result === strangerEndorse) {
        strangerCell.classList.add("--winner");
      }
      tableRow.append(strangerCell);
    } else {
      tableRow.lastChild.setAttribute("colspan", 2);
    }
    return tableRow;
  }

  function parseEndorsements(endorsements) {
    const mainHeaderRow = document.createElement("tr");
    const mainHeader = document.createElement("th");
    mainHeader.setAttribute("colspan", 3);
    mainHeader.classList.add("table__main-header", "dummy");
    mainHeaderRow.append(mainHeader);

    const subHeaderRow = document.createElement("tr");
    const subHeader = document.createElement("th");
    subHeader.setAttribute("colspan", 2);
    subHeader.classList.add("table__sub-header", "dummy");
    subHeaderRow.append(subHeader);

    const fillerCell = document.createElement("th");
    fillerCell.classList.add("table__sub-header");
    subHeaderRow.append(fillerCell);

    for (const [topLevel, subLevels] of Object.entries(endorsements)) {
      mainHeader.textContent = topLevel;
      mainHeader.classList.replace(
        mainHeader.classList.item(1), fullToKebab(topLevel)
      );
      tableBody.insertBefore(mainHeaderRow.cloneNode(true), tableEndPadding);

      for (const [subLevel, races] of Object.entries(subLevels)) {
        subHeader.textContent = subLevel;
        subHeader.classList.replace(
          subHeader.classList.item(1), fullToKebab(subLevel)
        );
        tableBody.insertBefore(subHeaderRow.cloneNode(true), tableEndPadding);

        for (const [race, info] of Object.entries(races)) {
          const endorseRow = newEndorsementRow(race, info);
          endorseRow.classList.add(fullToKebab(topLevel), fullToKebab(subLevel));
          tableBody.insertBefore(endorseRow, tableEndPadding);
        }
      }
    }

    firstRow = tableBody.querySelector("tr[class]"); // First non-header
    lastRow = tableEndPadding.previousElementSibling;

    const firstHeader = tableBody.querySelector("th");
    if (firstHeader.classList.contains("federal")
        || firstHeader.classList.contains("wa-state")) {
      setPamphletUrls(STATE_PAMPHLETS_URL);
    } else {
      setPamphletUrls(COUNTY_PAMPHLETS_URL);
    }
    // Need to initialize separately from displayPamphlet
    // Possibly async issue
  }
  function parseRaceInfoSections(sections) {
    const raceInfo = raceClass.getElem("info .sections");
    for (const [clsName, info] of Object.entries(sections)) {
      const section = document.createElement("section");
      section.classList.add(clsName, "--display-none");
      section.append(newTextContent(...info.h));
      for (const para of info.p) {
        section.append(newTextContent("p", para));
      }
      raceInfo.append(section);
    }
  }

  function resizeFooter() {
    if (wideScreenLayout()) {
      const newWidth = (
        tableWrapper.clientWidth + infoWrapper.clientWidth + BODY_MARGIN_PX
      );
      footerButtonBox.style.width = `${newWidth}px`;
    } else {
      footerButtonBox.style.width = null;
    }
  }

  async function resetData() {
    for (const selector of allThree) {
      selector.elems.clear();
    }

    pamphletProfiles = null;
    endorsementUrls = null;
    measuresData = null;

    portraits.clear();
    portraitDelay[seaTimesClass] = doNothing;
    portraitDelay[strangerClass] = doNothing;

    lastSectionClicked = raceClass;
    firstRow = null;
    lastRow = null;

    while (tableBody.firstChild.className !== "table__end-padding") {
      tableBody.firstChild.remove();
    }
  }
  async function fetchJSON(dateStr, file) {
    return fetch(`data/${dateStr}/${file}.json`)
      .then(resp => resp.json());
  }
  async function loadElection(dateStr) {
    electionSelect.disabled = true;
    loadingOverlay.classList.toggle("--display-none", false);
    setTimeout(() => {
      loadingOverlay.classList.toggle("--transparent", false);
    }, 25);

    await resetData();

    const pamphletPromise = fetchJSON(dateStr, "pamphlet_profiles_min");
    const endorsePromise = fetchJSON(dateStr, "merged_endorsements_min");
    const urlPromise = fetchJSON(dateStr, "merged_urls_min");
    const measurePromise = fetchJSON(dateStr, "pamphlet_measures_min");
    const raceInfoPromise = fetchJSON(dateStr, "race_info_sections_min");

    pamphletProfiles = await pamphletPromise;
    parseEndorsements(await endorsePromise);
    endorsementUrls = await urlPromise;
    measuresData = await measurePromise;
    parseRaceInfoSections(await raceInfoPromise);

    tableSeaTimesLink.href = SEA_TIMES_URLS.get(dateStr);
    tableStrangerLink.href = STRANGER_URLS.get(dateStr);

    if (smallScreenLayout()) {
      selectRow(firstRow, true);
    } else {
      firstRow.click();
    }

    resizeFooter();

    loadingOverlay.classList.toggle("--transparent", true);
    setTimeout(() => {
      loadingOverlay.classList.toggle("--display-none", true);
    }, DIALOG_TRANS_MS);
    electionSelect.disabled = false;
  }

  /* EVENT LISTENERS */
  /* https://css-tricks.com/prevent-page-scrolling-when-a-modal-is-open/ */
  window.addEventListener("scroll", () => {
    document.documentElement.style.setProperty(
      "--scroll-y", `${window.scrollY}px`
    );
  });
  window.addEventListener("resize", () => {
    normalizeBarAndBlurb();
    resizeFooter();

    const numSectionsOpen = numInfoSectionsOpen();
    const measureSelected = measureIsSelected();
    const scrollDisabled = bodyScrollDisabled();

    if (!wideScreenLayout() && !measureSelected && numSectionsOpen > 1) {
      if (seaTimesClass.infoIsOpen() && strangerClass.infoIsOpen()) {
        if (lastSectionClicked === strangerClass) {
          seaTimesClass.collapseInfo();
        } else {
          strangerClass.collapseInfo();
        }
      }
    }
    // Wide -> not wide

    if (!smallScreenLayout()) {
      if (scrollDisabled) {
        enableBodyScroll();
      }
      if (!raceClass.getElem("wrapper").style.flexShrink) {
        raceClass.getElem("wrapper").style.flexShrink = 0;
      }
    }
    // Small -> not small
    if (smallScreenLayout()) {
      if (!infoWrapper.classList.contains("info-wrapper--offscreen")
          && !scrollDisabled) {
        disableBodyScroll();
      }
      if (!measureSelected && numSectionsOpen > 1) {
        collapseOtherInfoSections(lastSectionClicked);
      }
    }
    // Not small -> small
  });

  electionSelect.addEventListener("input", () => {
    loadElection(electionSelect.value);
  });

  for (const prefix of ["about", "direct-link", "combined-share"]) {
    const openButton = document.querySelector(`#${prefix}-button`);
    const modal = document.querySelector(`.${prefix}-modal`);
    const closeButton = document.querySelector(`#${prefix}-close`);
    const urlInput = document.querySelector(`#${prefix}-url`);
    const copyButton = document.querySelector(`#${prefix}-copy-url-button`);

    openButton.addEventListener("click", () => {
      modal.classList.toggle("--display-none", false);
      // Needs a timeout after changing display: none
      setTimeout(() => {
        modal.classList.toggle("--transparent", false);
      }, 25);
      if (smallScreenLayout()) {
        disableBodyScroll();
      }
    });
    closeButton.addEventListener("click", () => {
      modal.classList.toggle("--transparent", true);
      setTimeout(() => {
        modal.classList.toggle("--display-none", true);
      }, DIALOG_TRANS_MS);
      if (bodyScrollDisabled()) {
        enableBodyScroll();
      }
    });
    urlInput.addEventListener("click", () => {
      urlInput.select();
    });
    tippy(urlInput, {
      content: "(Not) Copied to clipboard",
      trigger: "manual",
      triggerTarget: copyButton,
    });
    copyButton._tipTimer = null;
    copyButton.addEventListener("click", () => {
      clearTimeout(copyButton._tipTimer);
      urlInput.select();
      // document.execCommand("copy");
      urlInput._tippy.show();
      copyButton._tipTimer = setTimeout(() => {
        urlInput._tippy.hide();
      }, 3000);
    });
  }

  tableBody.addEventListener("click", e => {
    const tr = e.target.closest("tr");
    if (!tr || !tr.classList.length || tr === tableEndPadding) {
      // Headers rows have no classes
      return;
    }
    selectRow(tr);
  });

  // Disable scrolling main window from inside scrollable info sections
  infoWrapper.addEventListener("wheel", e => {
    if (e.ctrlKey) {
      // Allow Ctrl+wheel zooming
      return;
    }
    const closest = e.target.closest("[class*=info]");
    if (closest.scrollHeight === closest.clientHeight) {
      // Already fully displayed
      return;
    }
    if (closest === infoWrapper) {
      // Allow scrolling
    } else if (e.deltaY > 0 && completelyScrolledDown(closest)) {
      e.preventDefault();
    } else if (e.deltaY < 0 && !closest.scrollTop) {
      e.preventDefault();
    }
  },
  { passive: false });

  // *Also requires slowdowns if other sections closed before (??)
  raceClass.getElem("bar").addEventListener("click", () => {
    const isCollapsed = raceClass.elemHasClass("info", "info--collapsed");
    if (isCollapsed) {
      lastSectionClicked = raceClass;
      if (smallScreenLayout() && !measureIsSelected()
          && numInfoSectionsOpen() > 0) {
        collapseOtherInfoSections(raceClass);
        raceClass.toggleElemClass("info", "info--slow-speed", true);
      }
    }
    raceClass.collapseInfo(!isCollapsed);
    if (isCollapsed) {
      setTimeout(() => {
        raceClass.toggleElemClass("info", "info--slow-speed", false);
      }, INFO_TRANS_SLOW_MS);
    }
  });
  seaTimesClass.getElem("bar").addEventListener("click", () => {
    const isCollapsed = seaTimesClass.elemHasClass("info", "info--collapsed");
    if (isCollapsed) {
      lastSectionClicked = seaTimesClass;
      portraitDelay.get(seaTimesClass)();
      if (!measureIsSelected()) {
        if (smallScreenLayout() && numInfoSectionsOpen() > 0) {
          collapseOtherInfoSections(seaTimesClass);
          seaTimesClass.toggleElemClass("info", "info--slow-speed", true);
        } else if (mediumWidthLayout() && strangerClass.infoIsOpen()) {
          strangerClass.collapseInfo();
          seaTimesClass.toggleElemClass("info", "info--slow-speed", true);
        }
      }
    }
    seaTimesClass.collapseInfo(!isCollapsed);
    if (isCollapsed) {
      setTimeout(() => {
        seaTimesClass.toggleElemClass("info", "info--slow-speed", false);
      }, INFO_TRANS_SLOW_MS);
    }
    normalizeBarAndBlurb();
  });
  strangerClass.getElem("bar").addEventListener("click", () => {
    const isCollapsed = strangerClass.elemHasClass("info", "info--collapsed");
    if (isCollapsed) {
      lastSectionClicked = strangerClass;
      portraitDelay.get(strangerClass)();
      if (!measureIsSelected()) {
        if (smallScreenLayout() && numInfoSectionsOpen() > 0) {
          collapseOtherInfoSections(strangerClass);
          strangerClass.toggleElemClass("info", "info--slow-speed", true);
        } else if (mediumWidthLayout() && seaTimesClass.infoIsOpen()) {
          seaTimesClass.collapseInfo();
          strangerClass.toggleElemClass("info", "info--slow-speed", true);
        }
      }
    }
    strangerClass.collapseInfo(!isCollapsed);
    if (isCollapsed) {
      setTimeout(() => {
        strangerClass.toggleElemClass("info", "info--slow-speed", false);
      }, INFO_TRANS_SLOW_MS);
    }
    normalizeBarAndBlurb();
  });
  for (const selector of allThree) {
    selector.getElem("bar").addEventListener("keydown", e => {
      if (e.key === " ") {
        e.preventDefault();
        e.currentTarget.click();
      }
    });
  }

  window.addEventListener("keydown", e => {
    if (smallScreenLayout()) {
      return;
    }
    if (e.key === "ArrowLeft") {
      if (document.activeElement === electionSelect) {
        e.preventDefault();
      }
      selectPreviousRow();
    } else if (e.key === "ArrowRight") {
      if (document.activeElement === electionSelect) {
        e.preventDefault();
      }
      selectNextRow();
    }
  });
  rowUpBtn.addEventListener("click", selectPreviousRow);
  rowDownBtn.addEventListener("click", selectNextRow);
  rowCloseBtn.addEventListener("click", () => {
    enableBodyScroll();
    toggleInfoOffscreen(true);
  });

  document.querySelector("#back-to-top-button").addEventListener("click", () => {
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* MAIN */
  async function main() {
    await loadElection(electionSelect.value);
    // Need to wait for firstRow to be assigned in parseRaceInfoSections

    if (smallScreenLayout()) {
      const tip = tippy(firstRow, {
        content: "Tap a row for details",
        trigger: "manual",
        showOnCreate: true,
        hideOnClick: true,
        duration: [null, 0], // Disappear instantly
        theme: "light-border",
        zIndex: 0,
      });
      setTimeout(() => {
        tip.destroy();
      }, 5000);
    } else if (wideScreenLayout()) {
      const tip = tippy(firstRow.lastChild, {
        content: "Navigate with Left/Right keys",
        trigger: "manual",
        showOnCreate: true,
        hideOnClick: true,
        placement: "top-end",
        theme: "light-border",
        zIndex: 0,
      });
      setTimeout(() => {
        tip.hide(); // Hide instead of destroy for fade
      }, 3000);
    }
  }
  main();
});
