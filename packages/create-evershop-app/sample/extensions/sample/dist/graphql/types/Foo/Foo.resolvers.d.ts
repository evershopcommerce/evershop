declare namespace _default {
    namespace Query {
        function foo(root: any, { id }: {
            id: any;
        }): {
            id: number;
            name: string;
            description: string;
        } | undefined;
        function foos(): {
            id: number;
            name: string;
            description: string;
        }[];
    }
    namespace Foo {
        function id(foo: any): any;
        function name(foo: any): any;
        function description(foo: any): any;
    }
}
export default _default;
