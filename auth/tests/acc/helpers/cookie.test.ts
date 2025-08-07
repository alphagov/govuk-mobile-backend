import { CookieJar } from './cookie';
import type { Cookie } from './cookie';
import { describe, it, expect } from 'vitest';

const test_cookie =
  'csrf-state=abc12345; Expires=Mon, 19-May-2025 14:02:49 GMT; Path=/; Secure; HttpOnly; SameSite=None';

describe('Cookie helper tests', () => {
  it('should parse a cookie', () => {
    const parsed_cookie: Cookie = CookieJar.tryParse(test_cookie);
    expect(parsed_cookie.name).to.equal('csrf-state');
    expect(parsed_cookie.value).to.equal('abc12345');
    expect(parsed_cookie.expires).toEqual(new Date('2025-05-19T14:02:49.000Z'));
    expect(parsed_cookie.path).to.equal('/');
    expect(parsed_cookie.secure).to.equal(true);
    expect(parsed_cookie.httpOnly).to.equal(true);
    expect(parsed_cookie.sameSite).to.equal('None');
    expect(
      Math.abs(parsed_cookie.createdAt.getTime() - new Date().getTime()),
    ).toBeLessThan(100);
  });
  it('should create an empty cookie jar', () => {
    const cj = new CookieJar();
    expect(cj).toBeTruthy();
    expect(cj.cookies.size).to.equal(0);
  });
  it('should create a cookie jar and add a cookie', () => {
    const cj = new CookieJar('http://example.com', [test_cookie]);
    expect(cj).toBeTruthy();
    expect(cj.cookies.size).to.equal(1);
    expect(cj.cookies.get('csrf-state|example.com|/').name).toEqual(
      'csrf-state',
    );
    expect(cj.cookies.get('csrf-state|example.com|/').value).toEqual(
      'abc12345',
    );
    expect(cj.cookies.get('csrf-state|example.com|/').expires).toEqual(
      new Date('2025-05-19T14:02:49.000Z'),
    );
    expect(cj.cookies.get('csrf-state|example.com|/').path).toEqual('/');
    expect(cj.cookies.get('csrf-state|example.com|/').secure).toEqual(true);
    expect(cj.cookies.get('csrf-state|example.com|/').httpOnly).toEqual(true);
    expect(cj.cookies.get('csrf-state|example.com|/').sameSite).toEqual('None');
  });
  it('should create a cookie jar and add a single cookie as a string', () => {
    const cj = new CookieJar('http://example.com', test_cookie);
    expect(cj).toBeTruthy();
    expect(cj.cookies.size).to.equal(1);
    expect(cj.cookies.get('csrf-state|example.com|/').name).toEqual(
      'csrf-state',
    );
    expect(cj.cookies.get('csrf-state|example.com|/').value).toEqual(
      'abc12345',
    );
    expect(cj.cookies.get('csrf-state|example.com|/').expires).toEqual(
      new Date('2025-05-19T14:02:49.000Z'),
    );
    expect(cj.cookies.get('csrf-state|example.com|/').path).toEqual('/');
    expect(cj.cookies.get('csrf-state|example.com|/').secure).toEqual(true);
    expect(cj.cookies.get('csrf-state|example.com|/').httpOnly).toEqual(true);
    expect(cj.cookies.get('csrf-state|example.com|/').sameSite).toEqual('None');
  });
  it('should add a cookie to an existing cookie jar', () => {
    const cj = new CookieJar();
    expect(cj.cookies.size).to.equal(0);
    cj.addCookie('http://example.com', [test_cookie]);
    expect(cj.cookies.size).to.equal(1);
    expect(cj.cookies.get('csrf-state|example.com|/').name).to.equal(
      'csrf-state',
    );
  });
  it('should get all cookies for a matching domain', () => {
    const cj = new CookieJar();
    const cookie1 = 'Secure; HttpOnly; SameSite=None; foo=bar';
    const cookie2 =
      'Secure; HttpOnly; SameSite=None; bar=baz; Domain=example.com';
    const cookie3 = 'HttpOnly; SameSite=None; qux=quux';
    cj.addCookie('https://example.com', [cookie1]);
    cj.addCookie('https://example.com', [cookie2]);
    cj.addCookie('http://example.com', [cookie3]);
    const cookies = cj.getCookiesForUrl('https://example.com/foo/bar');
    expect(cookies.length).toEqual(3);
    expect(cookies[0].name).toEqual('foo');
    expect(cookies[0].value).toEqual('bar');
    expect(cookies[1].name).toEqual('bar');
    expect(cookies[1].value).toEqual('baz');
    expect(cookies[2].name).toEqual('qux');
    expect(cookies[2].value).toEqual('quux');
  });
  it('should get all cookies for a matching domain except those that have expired', () => {
    const cj = new CookieJar();
    const cookie1 = 'Secure; HttpOnly; SameSite=None; foo=bar';
    const cookie2 =
      'Secure; HttpOnly; SameSite=None; bar=baz; Domain=example.com; Max-Age=-1';
    const cookie3 =
      'HttpOnly; SameSite=None; qux=quux; Expires=Sun, 1 Jan 2023 12:00:00 GMT';
    cj.addCookie('https://example.com', [cookie1]);
    cj.addCookie('https://example.com', [cookie2]);
    cj.addCookie('http://example.com', [cookie3]);
    const cookies = cj.getCookiesForUrl('https://example.com/foo/bar');
    expect(cookies.length).toEqual(1);
    expect(cookies[0].name).toEqual('foo');
    expect(cookies[0].value).toEqual('bar');
  });
  it('should get all cookies for a matching sub domain', () => {
    const cj = new CookieJar();
    const cookie1 = 'Secure; HttpOnly; SameSite=None; foo=bar';
    const cookie2 =
      'Secure; HttpOnly; SameSite=None; bar=baz; Domain=example.com';
    cj.addCookie('https://example.com', [cookie1]);
    cj.addCookie('https://example.com', [cookie2]);
    const cookies = cj.getCookiesForUrl('https://sub.example.com/foo/bar');
    expect(cookies.length).toEqual(1);
    expect(cookies[0].name).toEqual('bar');
    expect(cookies[0].value).toEqual('baz');
  });
  it('should get all cookies for a matching path', () => {
    const cj = new CookieJar();
    const cookie1 = 'Secure; HttpOnly; SameSite=None; foo=bar; Path=/foo/bar';
    const cookie2 = 'Secure; HttpOnly; SameSite=None; bar=baz; Path=/bar/baz';
    cj.addCookie('https://example.com/foo/bar', [cookie1]);
    cj.addCookie('https://example.com', [cookie2]);
    const cookies = cj.getCookiesForUrl('https://example.com/foo/bar');
    expect(cookies.length).toEqual(1);
    expect(cookies[0].name).toEqual('foo');
    expect(cookies[0].value).toEqual('bar');
  });
  it('should get all cookies for an insecure endpoint', () => {
    const cj = new CookieJar();
    const cookie1 = 'Secure; SameSite=None; foo=bar';
    const cookie2 = 'SameSite=None; bar=baz';
    cj.addCookie('https://example.com', [cookie1]);
    cj.addCookie('https://example.com', [cookie2]);
    const cookies = cj.getCookiesForUrl('http://example.com');
    expect(cookies.length).toEqual(1);
    expect(cookies[0].name).toEqual('bar');
    expect(cookies[0].value).toEqual('baz');
  });
  it('should get all cookies for an secure endpoint', () => {
    const cj = new CookieJar();
    const cookie1 = 'Secure; SameSite=None; foo=bar';
    const cookie2 = 'SameSite=None; bar=baz';
    cj.addCookie('https://example.com', [cookie1]);
    cj.addCookie('https://example.com', [cookie2]);
    const cookies = cj.getCookiesForUrl('https://example.com');
    expect(cookies.length).toEqual(2);
    expect(cookies[0].name).toEqual('foo');
    expect(cookies[0].value).toEqual('bar');
    expect(cookies[1].name).toEqual('bar');
    expect(cookies[1].value).toEqual('baz');
  });
});

describe('Edge cases from DI', () => {
  it('should parse a DI session id cookie', () => {
    const cookie =
      'di-persistent-session-id=OFruD7vuACl4dlYIgWHeUYUR4sI--1750321262347; Max-Age=34190000; Domain=staging.account.gov.uk; Secure; HttpOnly;';
    const parsedCookie = CookieJar.tryParse(cookie);
    expect(parsedCookie).toBeTruthy();
  });
});
