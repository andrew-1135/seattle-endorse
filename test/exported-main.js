/* GLOBAL CONSTANT VALUES */
const EXEC_ABBR = new Map(Object.entries({
  "Lt.": "Lieutenant",
  "Sec.": "Secretary",
  "Comm.": "Commissioner",
  "Pub.": "Public",
  "Sup.": "Superintendent",
  "Instr.": "Instruction",
  "Dir.": "Director",
  "Elec.": "Elections",
  "Atty.": "Attorney",
  "Prsc.": "Prosecuting",
  "Exec.": "Executive",
}));
const MEASURE_ABBR = new Map(Object.entries({
  "Ref.": "Referendum Measure No.",
  ESJR: "Engrossed Senate Joint Resolution No.",
  SJR: "Senate Joint Resolution No.",
  Charter: "Charter Amendment No.",
  "Prop.": "Proposition No.",
  "Init.": "Initiative Measure No.",
}));
const STRANGER_STATE = { SEPARATE: 1, NONE: 2, COMBINED: 3 }; // Enum
const POS_MEASURE_VERBS = new Set(["Approve", "Yes"]);
const NEG_MEASURE_VERBS = new Set(["Reject", "No"]);
const MEASURE_VERBS = new Set([...POS_MEASURE_VERBS, ...NEG_MEASURE_VERBS]);
const NON_PARTIES = new Set(["Independent", "Nonpartisan"]);

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
export function findSingleNumber(string) {
  return string.match(/\d+/)[0];
}
export function expandAbbreviations(map, string) {
  let fullString = string;
  map.forEach((value, key) => {
    fullString = fullString.replace(key, value);
  });
  return fullString;
}
export function expandExecutive(executive) {
  return expandAbbreviations(EXEC_ABBR, executive);
}
export function expandMeasure(measure) {
  const expanded = expandAbbreviations(MEASURE_ABBR, measure);
  return expanded.replace("No. ", "No.\u00A0");
}
// Actual words -> actual-words
export function fullToKebab(fullText) {
  return (
    fullText
      .replace(/[.'\u2019]/g, "") // periods and apostrophes
      .replace(/ /g, "-")
      .toLowerCase()
  );
}
// camelCase -> camel-case
export function camelToKebab(camel) {
  return camel.replace(/[A-Z]/g, "-$&").toLowerCase();
}
export function newTextContent(elemType, text) {
  const newElem = document.createElement(elemType);
  newElem.textContent = text;
  return newElem;
}
/* https://stackoverflow.com/a/42860948 */
export function completelyScrolledDown(elem) {
  return (
    elem.scrollHeight // Total content height
    - elem.scrollTop // Distance from top
    - elem.clientHeight // Visible height
  ) < 1; // 1 accounts for borders, scroll bars, floating pixel count
}
