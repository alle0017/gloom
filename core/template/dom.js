import is from "./typeguard.js";
/**@import Component from "./component.js" */
/**
 * 
 * @param {Tree} leaf 
 * @param {string} tagName
 */
const cloneElement = ( leaf, tagName ) =>{

      if( leaf.reference && tagName == /**@type {HTMLElement}*/(leaf.reference).tagName ){
            const node = /**@type {HTMLElement}*/(leaf.reference.cloneNode( false ));

            for( let i = 0; i < node.attributes.length; i++ ){
                  node.setAttribute( node.attributes[i][0], '' );
            }
            return node;
      }

      leaf.reference = document.createElement( tagName );
      return leaf.reference;
}
/**
 * 
 * @param {Tree} leaf 
 * @param {string} text
 */
const cloneText = ( leaf, text )=> {
      if( leaf.reference ){
            const textNode = leaf.reference.cloneNode( false );
            
            textNode.textContent = text;
            return /**@type {Text}*/(textNode);
      }

      leaf.reference = document.createTextNode( text );
      return leaf.reference;
}

/**
 * create a straightforward dom element, that could be html element or
 * text element.
 * @param {string} name 
 * @param {Tree} leaf 
 */
export const createElement = ( name, leaf ) => {
      if( leaf.isTextNode ){
            return {
                  tag: [cloneText( leaf, name )],
                  needAttributes: false,
                  skipAttributes: false,
            };
      }
      return {
            tag: [cloneElement( leaf, name )],
            needAttributes: true,
            skipAttributes: false,
      };
}
// TODO add the reference (refToArgs) when the component is created
/**
* 
* @param {Component} component 
* @param {Tree} leaf 
* @param {unknown[]} args
* @param {number} refIdx represents the index used by refToArgs
* @param {Args[]} refToArgs
* @returns {RenderingResult}
*/
export const createComponent = ( component, leaf, args, refToArgs, refIdx ) => {
      return {
            tag: component.render({ 
                  tree: leaf.children,
                  args,
                  refToArgs,
                  idx: refIdx + 1,
            }),
            usedArgs: leaf.numOfInterpolations,
            needAttributes: false,
            skipAttributes: false,
      };
 }

/**
 * @param {Tree} leaf
 * @param {unknown[]} args
 * @param {Component[]} components 
 * @param {number} refIdx represents the index used by refToArgs
 * @param {Args[]} refToArgs
 * @returns {RenderingResult}
 */
export const createComponentList = ( components, leaf, args, refToArgs, refIdx )=>{
      const tree = [];

      if( !components.length ){
            tree.push( document.createTextNode('') );

            return {
                  tag: tree,
                  usedArgs: leaf.numOfInterpolations,
                  needAttributes: false,
                  skipAttributes: false,
            }
      }
      

      for( let i = 0; i < components.length; i++ ){
            tree.push( ...components[i].render({
                  tree: leaf.children,
                  args,
                  refToArgs,
                  idx: refIdx + 1,
            }));
      }
      return {
            tag: tree,
            usedArgs: leaf.numOfInterpolations,
            needAttributes: false,
            skipAttributes: false,
      };
}

/**
 * create an element from any object that is a reference, in some way, to a Reactive
 * @param {Reactive} reactive 
 * @param {unknown} value
 * @param {Tree} leaf
 * @param {unknown[]} args
 * @param {number} idx
 * @param {number} refIdx represents the index used by refToArgs
 * @param {Args[]} refToArgs
 * @returns {{ res: RenderingResult, unsubscribe: () => void }}
 */
export const createFromAnyReactive = ( reactive, value, leaf, args, idx, refToArgs, refIdx )=>{

      if( is.Component( value ) ){
            const res = createComponent( value, leaf, args.slice( idx, leaf.numOfInterpolations + 1 ), refToArgs, refIdx );
            const root = document.createTextNode('');            
            const unsubscribe = reactive.subscribe({
                  isComponent: true,
                  root: root,
            });

            res.tag.unshift(
                  /**
                   * @type {any}
                   */
                  (root) 
            );

            if( !refToArgs[ refIdx ] ){
                  refToArgs[ refIdx ] = {
                        isComponent: true,
                        root: [root],
                        isSubscription: true,
                        subscription: null,
                        children: leaf,
                  };
            }else{
                  refToArgs[ refIdx ].root.push(root);
            }

            refIdx++;


            return {
                  res,
                  unsubscribe,
            }; 
      }else if( is.ComponentList( value ) ){
            const res = createComponentList( value, leaf, args.slice( idx, leaf.numOfInterpolations + 1 ), refToArgs, refIdx );
            const root = document.createTextNode('');

            res.tag.unshift( 
                  /**
                  * @type {any} 
                  * otherwise it will throw error because is not HTMLElement and Text
                  */
                  (root) 
            );

            const unsubscribe = reactive.subscribe({
                  isComponent: true,
                  root: root,
            });

            if( !refToArgs[ refIdx ] ){
                  refToArgs[ refIdx ] = {
                        isComponent: true,
                        root: [root],
                        isSubscription: true,
                        subscription: null,
                        children: leaf,
                  };
            }else{
                  refToArgs[ refIdx ].root.push(root);
            }

            refIdx++;


            return {
                  res,
                  unsubscribe,
            };
      }else if( leaf.isTextNode ){
            const ref = document.createTextNode( /**@type {string}*/(value) );


            const unsubscribe = reactive.subscribe({
                  isComponent: false,
                  root: ref, 
                  tagName: false,
                  attributeValue: false,
                  attribute: null,
                  isTextNode: true,
            });

            if( !refToArgs[ refIdx ] ){
                  refToArgs[ refIdx ] = {
                        isTextNode: true,
                        root: [ref],
                        isSubscription: true,
                        subscription: null,
                  };
            }else{
                  refToArgs[ refIdx ].root.push(ref);
            }

            refIdx++;

            return {
                  res: {
                        usedArgs: 1,
                        needAttributes: false,
                        tag: [ref],
                        skipAttributes: false,
                  },
                  unsubscribe,
            }
      }else{
            const ref = document.createElement( /**@type {string}*/(value) );
            
            const unsubscribe = reactive.subscribe({
                  isComponent: false,
                  root: ref, 
                  tagName: true,
                  attributeValue: false,
                  attribute: null,
                  isTextNode: false,
            });
            
            if( !refToArgs[ refIdx ] ){
                  refToArgs[ refIdx ] = {
                        isTagName: true,
                        root: [ref],
                        isSubscription: true,
                        subscription: null,
                  };
            }else{
                  refToArgs[ refIdx ].root.push(ref);
            }

            refIdx++;


            return {
                  res: { 
                        usedArgs: 1,
                        needAttributes: true,
                        tag: [ref],
                        skipAttributes: false,
                  },
                  unsubscribe,
            }
      }
}
