const { assign } = require("../../src/lib/util/assign");

describe('assign', () => {
    it('It should assign an object to the main object', () => {
        let a = { a: 1 }
        let b = { b: 1 }
        assign(a, b)
        expect(a).toEqual({ a: 1, b: 1 })
    })

    it('It should thrown an exception if `object` is not an object or null', () => {
        let a = 1
        let b = { b: 1 }
        expect(() => assign(a, b)).toThrow(Error);
    })

    it('It should thrown an exception if `object` is not an object or null', () => {
        let a = null
        let b = { b: 1 }
        expect(() => assign(a, b)).toThrow(Error);
    })

    it('It should thrown an exception if data is not an object or null', () => {
        let a = { a: 1 }
        let b = 1
        expect(() => assign(a, b)).toThrow(Error);
    })

    it('It should thrown an exception if data is not an object or null', () => {
        let a = { a: 1 }
        let b = null
        expect(() => assign(a, b)).toThrow(Error);
    })

    it('It should overwrite if the property is already existed', () => {
        let a = { a: 1, b: 1 }
        let b = { b: 2 }
        assign(a, b);
        expect(a).toEqual({ a: 1, b: 2 })
    })
})