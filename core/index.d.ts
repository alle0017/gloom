

interface Subscriber {
      update(): void;
}

type Ref<T extends HTMLElement> = {
      element: T,
      __isRef__: boolean,
}

type ScopedCss = {
      __css__Key: string,
}

type LifecycleHook = {
      onMount( callback: () => void ): void;
      onDispose( callback: () => void ): void;
      onError( callback: ( e: Error ) => void ): void;
}
export type Component = {}
export type Effect<T> = {
      state: T
}
export type Signal<T> = {
      value: T,
      map<V>( callback: T extends Array<infer K> ? (v: K, index: number) => V : (v: T) => V ): Effect<V | V[]>
}

//export { css } from "./css/index.js";
/**
 * creates a new scoped css module and return a unique key
 * that can be inserted later as an attribute in the html. 
 * All the tags that **follows** the tag with the key attribute get the scope.\
 * the scoped css is made adding a class to all the css selectors.
 * the class used is `.--Component--Scope__Key__` followed by a unique, randomly generated number
 * @example 
 * ```javascript
 * const key = css`
 *  p {
 *      background-color: #fff;
 *  }`
 * 
 * html`
 *      <p>i'm not scoped</p>
 *      <p scope=${key}> // <= this is not scoped
 *            <p> i'm scoped !!!</p>
 *      </p>
 *      <p> i'm scoped too!</p>
 * `
 * ```
 * @param {TemplateStringsArray} strings 
 * @param  {...unknown} args 
 */
export function css(strings: TemplateStringsArray, ...args: unknown[]): ScopedCss;
export function html(strings: TemplateStringsArray, ...args: unknown[]): Component;
export function createRoot(component: Component, root: HTMLElement): void;
/**
 * create a context that can be retrieved by calling 
 * the function returned by the createContext hook.
 * @example
 * ```javascript
 * const useTheme = createContext({ theme: 'dark' });
 * // ... later in the code
 * 
 * const theme = useTheme();
 * if( theme.theme == 'dark' ){
 *     console.log('is dark!!!');
 * }
 * ```
 * @template {{}} T
 * @param {T} ctx
 */
export function createContext<T extends {}>(ctx: T): () => T;
/**
 * create a state variable. each time variable.value changes, 
 * it triggers the reload of each component that uses it.
 * `Signal` is the most important class of the frameworks.
 * it enables fine-grained reactivity and dependency tracking.
 * > important note: at current state, `Signal` are shallow, 
 * > so if you change an internal property or you call a modifier
 * > method the ui will not be updated.
 *  @example 
 * ```js
 * const signal = $signal(0);
 * 
 * html`
 *    ${signal}
 *    <button ＠click=${() => signal.value++} > ADD </button>
 * `
 * 
 * ```
 * @template T
 * @param {T} value 
 */
export function $signal<T>(value: T): Signal<T>;
/**
 * creates an `Effect`. Effects are computed properties, that are 
 * calculated each time one of the the dependencies changes. Effect are
 * useful also for reactive conditional rendering.
 * ### all the properties of the `Effect` object should not be used directly.
 * @example 
 * ```js
 * const signal = $signal(0);
 * const effect = $effect(() => signal.value + 10, signal)
 * 
 * 
 * html`
 *    <div>${signal} + 10 = ${effect}</div>
 * `
 * 
 * ```
 * @template T
 * @param {() => T} value 
 * @param {Signal<unknown>[]} states
 */
export function $effect<T>(value: () => T, ...states: Signal<unknown>[]): Effect<T>;
/**
 * connect the callback to the specified signal, producing a non-computed side effect.
 * the returned value is the unsubscribe function, that can be used to detach the listener
 * from the subscription list. 
 * * @example 
 * ```js
 * const signal = $signal(0);
 * const unsubscribe = $watcher(() => console.log(signal.value), signal)
 * 
 * signal.value += 2; // log: 2
 * signal.value += 2; // log: 4
 * unsubscribe();
 * signal.value += 2; // log: nothing
 * ```
 * @param {()=>void} callback 
 * @param {Signal<unknown>} signal 
 */
export function $watcher(callback: () => void, signal: Signal<unknown>): () => Subscriber;
/**
 * provides an hook to an element of the DOM.\
 * note that you don't need to pass it as value of the attribute 'ref', any attribute is valid
 * @example
 * ```javascript
 * function Input(){
 *    const input = $ref();
 *    
 *    return html`
 *          <input 
 *           type="text"
 *           value=""
 *           ref=${input}
 *           ＠change="${() => console.log(input.element.value)}"
 *          />
 *    `
 * }
 * ```
 * @template {HTMLElement} T - the type of the element you wish to anchor with the `$ref`
 * @returns {Ref<T>}
 */
export function $ref<T extends HTMLElement>(): Ref<T>;
/**
 * create a function that will return a component with the possibility
 * to associate lifecycle hooks. This function enables composition API
 * and more fine-grained lifecycle handling
 * @example
 * ```javascript
 * const Name = useLifecycle(({ onMount }) => {
 *      onMount(() => {
 *                console.log('executed with the other')
 *      })
 *      return ({ name }) =>{
 *          onMount(() => {
 *                console.log(name)
 *          });
 *           return html`<div>${name}</div>`
 *      }
 * })
 * ```
 * @template T
 * @param {(on: LifecycleHook) => ((args: T) => Component)} factory 
 */
export function useLifecycle<T>(factory: (on: LifecycleHook) => (args: T) => Component): (args: T) => Component;

export const GApp: {
      /**
       * ## 🧪 this method is experimental 🧪 
       * register a component that can be later used inside templates as a normal tag.
       * #### Note, if you want to register a function generated by another function (like useLifecycle ones), you need to explicity pass a name
       * @example
       * ```javascript
       * function Component({ args }){
       *    return html`<div>${args}</div>`
       * }
       * 
       * function App(){
       *    return html`<Component args=${'hello world!'}/>`
       * }
       * // ... later
       * 
       * GApp.registerComponent(Component).createRoot(App(), document.body)
       * ```
       * 
       */
      registerComponent(component: (args: Record<string, unknown> ) => Component, name?: string ): typeof GApp;
      createRoot(component: Component, root: HTMLElement):  typeof GApp;
}