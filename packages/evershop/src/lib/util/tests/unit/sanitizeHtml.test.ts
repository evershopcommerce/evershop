import { describe, expect, it } from '@jest/globals';
import { sanitize, sanitizeRawHtml, stripTags } from '../../sanitizeHtml.js';

describe('sanitize (rich-text allow-list)', () => {
  it('drops script tags and their bodies but keeps surrounding text', () => {
    expect(sanitize('<p>Hi</p><script>alert(1)</script><p>there</p>')).toBe(
      '<p>Hi</p><p>there</p>'
    );
    expect(sanitize('a<script>alert(1)</script>b')).toBe('ab');
    expect(sanitize('<style>body{display:none}</style><p>after</p>')).toBe(
      '<p>after</p>'
    );
  });

  it('removes event-handler attributes', () => {
    expect(sanitize('<img src="/x.png" onerror="alert(1)" alt="x">')).toBe(
      '<img src="/x.png" alt="x">'
    );
    expect(sanitize('<a href="/a" onclick="alert(1)">link</a>')).toBe(
      '<a href="/a">link</a>'
    );
    expect(sanitize('<div><p onmouseover="x()">t</p></div>')).toBe(
      '<div><p>t</p></div>'
    );
  });

  it('removes href/src with a disallowed scheme, including obfuscated ones', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      '&#106;avascript:alert(1)',
      'java\tscript:alert(1)',
      ' javascript:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html;base64,AAAA'
    ]) {
      expect(sanitize(`<a href="${bad}">bad</a>`)).toBe('<a>bad</a>');
    }
    expect(sanitize('<img src="data:image/png;base64,AAAA" alt="d">')).toBe(
      '<img alt="d">'
    );
  });

  it('keeps http, https, mailto, tel, relative and protocol-relative URLs', () => {
    expect(
      sanitize('<a href="https://evershop.io/x?y=1&z=2" target="_blank" name="n">ok</a>')
    ).toBe('<a href="https://evershop.io/x?y=1&amp;z=2" target="_blank" name="n">ok</a>');
    expect(sanitize('<a href="mailto:a@b.co">m</a> <a href="tel:+123">t</a>')).toBe(
      '<a href="mailto:a@b.co">m</a> <a href="tel:+123">t</a>'
    );
    expect(sanitize('<img src="//cdn.example.com/i.png" alt="p">')).toBe(
      '<img src="//cdn.example.com/i.png" alt="p">'
    );
    expect(sanitize('<a href="/category/x">rel</a><a href="#top">a</a><a href="x">x</a>')).toBe(
      '<a href="/category/x">rel</a><a href="#top">a</a><a href="x">x</a>'
    );
  });

  it('keeps the image attributes the editor writes, including an empty alt', () => {
    expect(
      sanitize(
        '<img src="/a.jpg" srcset="/a.jpg 1x, /b.jpg 2x" alt="" title="T" width="10" height="20" loading="lazy" class="c" id="i" style="width:100%">'
      )
    ).toBe(
      '<img src="/a.jpg" srcset="/a.jpg 1x, /b.jpg 2x" alt="" title="T" width="10" height="20" loading="lazy" class="c" id="i" style="width:100%">'
    );
    expect(sanitize('<img src="/a.jpg" srcset="javascript:x 1x" alt="s">')).toBe(
      '<img src="/a.jpg" alt="s">'
    );
  });

  it('keeps class/id/style on any tag, but drops styles that smuggle scripts', () => {
    expect(sanitize('<div class="row" id="main"><span style="font-weight:bold">s</span></div>')).toBe(
      '<div class="row" id="main"><span style="font-weight:bold">s</span></div>'
    );
    expect(sanitize('<div style="color:red;background:url(javascript:alert(1))">s</div>')).toBe(
      '<div>s</div>'
    );
    expect(sanitize('<div style="width:expression(alert(1))">s</div>')).toBe('<div>s</div>');
  });

  it('strips unknown elements but keeps their text', () => {
    expect(sanitize('<custom-el foo="1">keep text</custom-el><marquee>m</marquee>')).toBe(
      'keep textm'
    );
    expect(sanitize('<svg onload="alert(1)"><circle r="1"/></svg>text')).toBe('text');
    expect(sanitize('<form action="/x"><input name="q"><button>go</button></form>')).toBe('go');
    expect(sanitize('<object data="x.swf"></object><embed src="x.swf">')).toBe('');
    expect(sanitize('<base href="https://evil/"><a href="x">x</a>')).toBe('<a href="x">x</a>');
  });

  it('does not lose text around a bare "<" that opens no tag', () => {
    expect(sanitize('<p>1 < 2 and 3 > 2</p>')).toBe('<p>1 &lt; 2 and 3 &gt; 2</p>');
  });

  it('removes comments and preserves formatting, lists and tables', () => {
    expect(sanitize('<p>a</p><!-- hidden --><p>b</p>')).toBe('<p>a</p><p>b</p>');
    expect(
      sanitize('<p>Some <strong>bold</strong>, <em>em</em>, <code>x</code>, <br>next</p>')
    ).toBe('<p>Some <strong>bold</strong>, <em>em</em>, <code>x</code>, <br>next</p>');
    expect(sanitize('<ul><li>one</li><li><a href="/two">two</a></li></ul>')).toBe(
      '<ul><li>one</li><li><a href="/two">two</a></li></ul>'
    );
    expect(
      sanitize('<table class="t"><thead><tr><th>h</th></tr></thead><tbody><tr><td>d</td></tr></tbody></table>')
    ).toBe('<table class="t"><thead><tr><th>h</th></tr></thead><tbody><tr><td>d</td></tr></tbody></table>');
    expect(sanitize('<p class=foo id=bar>t</p>')).toBe('<p class="foo" id="bar">t</p>');
  });

  it('returns an empty string for non-string input', () => {
    expect(sanitize(undefined)).toBe('');
    expect(sanitize(null)).toBe('');
    expect(sanitize(42)).toBe('');
    expect(sanitize('')).toBe('');
  });

  it('is idempotent, so write-time and render-time sanitization agree', () => {
    const once = sanitize('<p onclick="x()">Tom &amp; <a href="/a?b=1&c=2">J</a></p><script>1</script>');
    expect(sanitize(once)).toBe(once);
  });
});

describe('sanitizeRawHtml (EditorJS rows)', () => {
  it('sanitizes raw blocks in place and leaves other blocks alone', () => {
    const rows = [
      {
        id: 'r',
        size: 12,
        columns: [
          {
            id: 'c',
            size: 12,
            data: {
              blocks: [
                { type: 'raw', data: { html: '<p>ok</p><script>bad()</script>' } },
                { type: 'paragraph', data: { text: '<script>untouched</script>' } }
              ]
            }
          }
        ]
      }
    ];
    sanitizeRawHtml(rows);
    expect(rows[0].columns[0].data.blocks[0].data.html).toBe('<p>ok</p>');
    expect(rows[0].columns[0].data.blocks[1].data.text).toBe('<script>untouched</script>');
  });

  it('tolerates malformed input', () => {
    expect(() => sanitizeRawHtml(undefined as any)).not.toThrow();
    expect(() => sanitizeRawHtml([{ id: 'r', size: 12, columns: undefined as any }])).not.toThrow();
  });
});

describe('stripTags (plain-text sinks such as blog comments)', () => {
  it('removes every tag and keeps the text', () => {
    expect(stripTags('<b>hi</b> <a href="javascript:x">there</a>')).toBe('hi there');
  });
  it('drops script and style bodies entirely', () => {
    expect(stripTags('before<script>alert(1)</script>after<style>p{}</style>')).toBe('beforeafter');
  });
  it('removes attribute-only payloads', () => {
    expect(stripTags('<img src=x onerror="alert(1)">')).toBe('');
  });
  it('decodes entities so a text sink does not show them twice', () => {
    expect(stripTags('Tom &amp; Jerry &lt;3')).toBe('Tom & Jerry <3');
  });
  it('keeps a bare < that is not a tag', () => {
    expect(stripTags('1 < 2 and 3 > 2')).toBe('1 < 2 and 3 > 2');
  });
  it('tolerates null and undefined', () => {
    expect(stripTags(null)).toBe('');
    expect(stripTags(undefined)).toBe('');
  });
});
