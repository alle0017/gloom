import Effect from "./reactivity/effect.js";
import Signal from "./reactivity/signal.js";
import Component from "./template/component.js";
export { css } from "./css/index.js";
export { Signal, Component, Effect };
/**
 * 
 * @param {TemplateStringsArray} strings 
 * @param  {...unknown} args 
 */
export const html = ( strings, ...args ) => {
      return new Component( strings, ...args );
}

/**
 * 
 * @param {Component} component 
 * @param {HTMLElement} root
 */
export const createRoot = ( component, root )=>{
      root.append( ...component.render({ tree: [], args: [], refToArgs: [], idx: 0 }) );
}


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
export const createContext = ctx => {
      return () => {
            return ctx;
      }
}


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
export const $signal = value => new Signal( value );

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
export const $effect = ( value, ...states ) => new Effect( value, ...states );

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
export const $watcher = ( callback, signal ) => signal.subscribeEffect( { update: callback } );
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
export const $ref = () => {
      return {
            element: undefined,
            __isRef__: true,
      };
} 

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
export const useLifecycle = factory => {
      /**
       * @type {Array<()=>void>}
       */
      const onMount = [];
      /**
       * @type {Array<()=>void>}
       */
      const onDispose = [];
      /**
       * @type {Array<(e: Error)=>void>}
       */
      const onError = [];

      const componentFactory = factory({ 
            onMount: c => onMount.push(c),
            onDispose: c => onDispose.push(c),
            onError: c => onError.push(c),
      });


      /**
       * @param {T} args
       */
      return args => {
            const component = componentFactory( args );
            component.__dispose = onDispose;
            component.__mount = onMount;
            component.__error = onError;
            return component
      }
}
export const GApp = {
      /**
       * 
       * @param {(args: Record<string,unknown>) => Component} component 
       * @param {string} name 
       */
      registerComponent( component, name ) {
            if( !component.name && !name ){
                  throw new Error('component can be registered because is anonymous. Probably is the result of an high-order function call. In this case, explicitly pass a name as argument of the "registerComponent"')
            }

            Component.__register.set(
                  name? name : component.name,
                  component
            );
            return this;
      },
      /**
       * 
       * @param {Component} component 
       * @param {HTMLElement} root
       */
      createRoot( component, root ){
            root.append( ...component.render({ tree: [], args: [], refToArgs: [], idx: 0 }) );
            return this;
      }
}