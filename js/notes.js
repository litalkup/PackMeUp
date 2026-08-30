/*
 * PackMeUp - reading a note pasted or shared from somewhere else.
 *
 * Google Keep has no API for personal accounts, so a note reaches us as plain
 * text: copied out of Keep, or handed over by Android's share sheet. Both
 * arrive as lines, with whatever checkbox characters the source used.
 *
 * A ticked line in the note means the thing is already packed, so that state
 * is carried across rather than thrown away.
 */
(function (global) {
  'use strict';

  /* "- [x] socks", "☑ socks", "• socks", "  ☐ socks" */
  var CHECKBOX = /^[-*•·‣▪–—]?[ \t]*\[([^\]]?)\][ \t]*(.*)$/;
  var SYMBOL = /^([☐☑☒✅✔✓✗✘⬜✅])[ \t]*(.*)$/;
  var BULLET = /^[-*•·‣▪–—][ \t]+(.*)$/;
  var TICKED = 'xXvV✓✔☑☒✅✗✘';

  function isTicked(mark) {
    return !!mark && TICKED.indexOf(mark) !== -1;
  }

  /* One line of the note -> { text, packed }, or null if there is nothing left. */
  function parseLine(raw) {
    var text = String(raw == null ? '' : raw)
      .replace(/[ ‎‏‪-‮]/g, ' ')   /* nbsp, bidi marks */
      .trim();
    if (!text) return null;

    var packed = false;
    var marked = false;
    var match;

    if ((match = text.match(CHECKBOX))) {
      packed = isTicked(match[1].trim());
      text = match[2];
      marked = true;
    } else if ((match = text.match(SYMBOL))) {
      packed = isTicked(match[1]);
      text = match[2];
      marked = true;
    } else if ((match = text.match(BULLET))) {
      text = match[1];
      marked = true;
    }

    text = text.trim();
    if (!text) return null;
    return { text: text, packed: packed, marked: marked };
  }

  /*
   * parse(noteText) -> { title, lines: [{ text, packed }] }
   *
   * The first line becomes the title only when it carries no marker of its own
   * and something below it does - which is how a Keep note with a heading and a
   * checklist comes out. Otherwise every line is an item.
   */
  function parse(text) {
    var raw = String(text == null ? '' : text).split(/\r\n|\r|\n/);
    var lines = [];
    raw.forEach(function (line) {
      var parsed = parseLine(line);
      if (parsed) lines.push(parsed);
    });

    var title = null;
    if (lines.length > 1 && !lines[0].marked && !lines[0].packed) {
      var restIsList = lines.slice(1).some(function (line) { return line.marked; });
      if (restIsList) {
        title = lines[0].text;
        lines = lines.slice(1);
      }
    }

    return {
      title: title,
      lines: lines.map(function (line) {
        return { text: line.text, packed: line.packed };
      })
    };
  }

  function packedCount(lines) {
    return lines.filter(function (line) { return line.packed; }).length;
  }

  global.PMU = global.PMU || {};
  global.PMU.notes = {
    parse: parse,
    parseLine: parseLine,
    packedCount: packedCount
  };
})(window);
