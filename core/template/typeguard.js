import Signal from "../reactivity/signal.js";
import ComponentParser from "./component-parser.js";
import Component from "./component.js";
import Effect from "../reactivity/effect.js";
const is = {
      /**
       * check if object is an effect
       * @param {unknown} value 
       * @returns {value is Effect}
       */
      Effect: value => value && value instanceof Effect,
      /**
       * check if object is an effect
       * @param {unknown} value 
       * @returns {value is Signal}
       */
      Reactive: value => value && value instanceof Signal,
      /**
       * check if object is a Ref
       * @param {unknown} value 
       * @returns {value is Ref<HTMLElement>}
       */
      Ref: value => value && typeof value == 'object' && '__isRef__' in value && value.__isRef__ && 'element' in value && !Boolean(value.element),
      /**
       * true if the leaf is `<Children/>`
       * @param {Tree} leaf 
       * @param {unknown} arg 
       * @returns {boolean} 
       */
      ChildrenLeaf: ( leaf, arg ) => Boolean( leaf.tagName == 'Children' || ( leaf.tagName == ComponentParser.pointerToReactive && typeof arg == 'string' && arg == 'Children' ) ),
      /**
       * 
       * @param {unknown} value 
       * @returns {value is Component}
       */
      Component: value => typeof value == 'object' && value instanceof Component,
      /**
       * check if object is a component list
       * note, it only checks the first and the last elements, 
       * ### if the first and the last elements are a Component, **all** the list will be rendered as a component
       * @param {unknown} value 
       * @returns {value is Component[]}
       */
      ComponentList: value => typeof value == 'object' && value instanceof Array && (value[0] instanceof Component || value.length <= 0),
}

export default  is;