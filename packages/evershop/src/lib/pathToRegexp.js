const isarray = (e) => Array.isArray(e);

function parse(e, t) {
  for (
    var r, n = [], o = 0, a = 0, i = '', p = (t && t.delimiter) || '/';
    (r = PATH_REGEXP.exec(e)) != null;

  ) {
    const s = r[0];
    const c = r[1];
    const u = r.index;
    if (((i += e.slice(a, u)), (a = u + s.length), c)) i += c[1];
    else {
      const l = e[a];
      const g = r[2];
      const f = r[3];
      const x = r[4];
      const h = r[5];
      const d = r[6];
      const m = r[7];
      i && (n.push(i), (i = ''));
      const y = g != null && l != null && l !== g;
      const R = d === '+' || d === '*';
      const T = d === '?' || d === '*';
      const E = r[2] || p;
      const v = x || h;
      n.push({
        name: f || o++,
        prefix: g || '',
        delimiter: E,
        optional: T,
        repeat: R,
        partial: y,
        asterisk: !!m,
        pattern: v ? escapeGroup(v) : m ? '.*' : `[^${escapeString(E)}]+?`
      });
    }
  }
  return a < e.length && (i += e.substr(a)), i && n.push(i), n;
}
function compile(e, t) {
  return tokensToFunction(parse(e, t));
}
function encodeURIComponentPretty(e) {
  return encodeURI(e).replace(
    /[\/?#]/g,
    (e) => `%${e.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
function encodeAsterisk(e) {
  return encodeURI(e).replace(
    /[?#]/g,
    (e) => `%${e.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
function tokensToFunction(e) {
  for (var t = new Array(e.length), r = 0; r < e.length; r++)
    typeof e[r] === 'object' && (t[r] = new RegExp(`^(?:${e[r].pattern})$`));
  return function (r, n) {
    for (
      var o = '',
        a = r || {},
        i = n || {},
        p = i.pretty ? encodeURIComponentPretty : encodeURIComponent,
        s = 0;
      s < e.length;
      s++
    ) {
      const c = e[s];
      if (typeof c !== 'string') {
        var u;
        const l = a[c.name];
        if (l == null) {
          if (c.optional) {
            c.partial && (o += c.prefix);
            continue;
          }
          throw new TypeError(`Expected "${c.name}" to be defined`);
        }
        if (isarray(l)) {
          if (!c.repeat)
            throw new TypeError(
              `Expected "${
                c.name
              }" to not repeat, but received \`${JSON.stringify(l)}\``
            );
          if (l.length === 0) {
            if (c.optional) continue;
            throw new TypeError(`Expected "${c.name}" to not be empty`);
          }
          for (let g = 0; g < l.length; g++) {
            if (((u = p(l[g])), !t[s].test(u)))
              throw new TypeError(
                `Expected all "${c.name}" to match "${
                  c.pattern
                }", but received \`${JSON.stringify(u)}\``
              );
            o += (g === 0 ? c.prefix : c.delimiter) + u;
          }
        } else {
          if (((u = c.asterisk ? encodeAsterisk(l) : p(l)), !t[s].test(u)))
            throw new TypeError(
              `Expected "${c.name}" to match "${c.pattern}", but received "${u}"`
            );
          o += c.prefix + u;
        }
      } else o += c;
    }
    return o;
  };
}
function escapeString(e) {
  return e.replace(/([.+*?=^!:${}()[\]|\/\\])/g, '\\$1');
}
function escapeGroup(e) {
  return e.replace(/([=!:$\/()])/g, '\\$1');
}
function attachKeys(e, t) {
  return (e.keys = t), e;
}
function flags(e) {
  return e.sensitive ? '' : 'i';
}
function regexpToRegexp(e, t) {
  const r = e.source.match(/\((?!\?)/g);
  if (r) {
    for (let n = 0; n < r.length; n++) {
      t.push({
        name: n,
        prefix: null,
        delimiter: null,
        optional: !1,
        repeat: !1,
        partial: !1,
        asterisk: !1,
        pattern: null
      });
    }
  }
  return attachKeys(e, t);
}
function arrayToRegexp(e, t, r) {
  for (var n = [], o = 0; o < e.length; o++)
    n.push(pathToRegexp(e[o], t, r).source);
  return attachKeys(new RegExp(`(?:${n.join('|')})`, flags(r)), t);
}
function stringToRegexp(e, t, r) {
  return tokensToRegExp(parse(e, r), t, r);
}
function tokensToRegExp(e, t, r) {
  isarray(t) || ((r = t || r), (t = [])), (r = r || {});
  for (var n = r.strict, o = !1 !== r.end, a = '', i = 0; i < e.length; i++) {
    const p = e[i];
    if (typeof p === 'string') a += escapeString(p);
    else {
      const s = escapeString(p.prefix);
      let c = `(?:${p.pattern})`;
      t.push(p),
        p.repeat && (c += `(?:${s}${c})*`),
        (c = p.optional
          ? p.partial
            ? `${s}(${c})?`
            : `(?:${s}(${c}))?`
          : `${s}(${c})`),
        (a += c);
    }
  }
  const u = escapeString(r.delimiter || '/');
  const l = a.slice(-u.length) === u;
  return (
    n || (a = `${l ? a.slice(0, -u.length) : a}(?:${u}(?=$))?`),
    (a += o ? '$' : n && l ? '' : `(?=${u}|$)`),
    attachKeys(new RegExp(`^${a}`, flags(r)), t)
  );
}
function pathToRegexp(e, t, r) {
  return (
    isarray(t) || ((r = t || r), (t = [])),
    (r = r || {}),
    e instanceof RegExp
      ? regexpToRegexp(e, t)
      : isarray(e)
      ? arrayToRegexp(e, t, r)
      : stringToRegexp(e, t, r)
  );
}

var PATH_REGEXP = new RegExp(
  [
    '(\\\\.)',
    '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?|(\\*))'
  ].join('|'),
  'g'
);

export { pathToRegexp, parse, compile, tokensToFunction, tokensToRegExp };
