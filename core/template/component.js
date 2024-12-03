import ComponentParser from './component-parser.js';
import Effect from '../reactivity/effect.js';
import Signal from '../reactivity/signal.js';
import * as dom from './dom.js';
import * as List from '../reactivity/list.js';

/**
* true if the leaf is `<Children/>`
* @param {Tree} leaf 
* @param {unknown} arg 
* @returns {boolean} 
*/
const isChildrenLeaf = ( leaf, arg ) => Boolean( leaf.tagName == 'Children' || ( leaf.tagName == ComponentParser.pointerToReactive && typeof arg == 'string' && arg == 'Children' ) );
/**
* check if object is a Ref
* @param {unknown} value 
* @returns {value is Ref<HTMLElement>}
*/
const isRef = value => value && typeof value == 'object' && '__isRef__' in value && value.__isRef__ && 'element' in value && !Boolean(value.element)

/**
* check if object is a Ref
* @param {unknown} value 
* @returns {value is ScopedCss}
*/
const isScopedCss = value => value && typeof value == 'object' && '__css__Key' in value && typeof value.__css__Key == 'string'
/**
 * check if object is a component list
 * note, it only checks the first and the last elements, 
 * ### if the first and the last elements are a Component, **all** the list will be rendered as a component
 * @param {unknown} value 
 * @returns {value is Component[]}
 */
const isComponentList = value => typeof value == 'object' && value instanceof Array && (value[0] instanceof Component || value.length <= 0);

/**
 * @implements {Drawable}
 */
export default class Component {

      /**
       * @type {Map<string,{ tree: Tree[] }>}
       */
      static #cachedTrees = new Map();

      /**
       * @type {Map<string, (args: Record<string,unknown>) => Component>}
       */
      static __register = new Map();

      static #id = 0;;

      #pid;

      /**
       * @type {Array<string>}
       */
      #cssKeys = [];

      /**
       * @readonly
       * @type {Tree[]}
       */
      #tree;

      /**
       * @type {Array<HTMLElement|Text>}
       */
      #root;

      /**
       * @type {unknown[]}
       */
      #args = [];

      /**
       * @type {Args[]}
       */
      #refToArgs = [];

      /**
       * @type {ListRoot<()=>void>}
       */
      #subs = {
            head: null,
      };

      /**
       * @type {Array<()=>void>}
       */
      __dispose = [];
      /**
       * @type {Array<()=>void>}
       */
      __mount = [];
      /**
       * @type {Array<(e: Error)=>void>}
       */
      __error = [];

      /**
       * @type {Readonly<unknown[]>}
       */
      get args(){
            return this.#args;
      }

      /**
       * @param {TemplateStringsArray} html
       * @param {unknown[]} args
       * @hideconstructor
       */
      constructor( html, ...args ) {
            const template = ComponentParser.reduceTemplateStringArray( html );
            const key = template.replaceAll(/\s+/ig, '');

            if( Component.#cachedTrees.has( key ) ) {
                  this.#tree = Component.#cachedTrees.get( key ).tree;
            }else{
                  this.#tree = ComponentParser.createHtmlTree( template );
                  Component.#cachedTrees.set( key, {
                        tree: this.#tree
                  });
            }

            this.#pid = Component.#id++;
            this.#refToArgs = new Array( args.length );
            this.#args = args;
      }

      /**
       * returns the html instance of the component passed as input
       * @param {Readonly<Tree>} leaf
       * @param {unknown[]} args
       * @param {number} idx 
       * @param {number} refIdx represents the index used by refToArgs
       * @param {Args[]} refToArgs
       */
      #createRegisteredElement( leaf, args, idx, refToArgs, refIdx){
            /**
             * @type {Record<string,unknown>}
             */
            const props = {};
            // prop keys that are ${...}
            const boundKeys = [];
            // if an arg is used, then we add it to skip it during the next update
            let numOfArgs = 0;

            for( let i = 0; i < leaf.attributes.length; i++ ){
                  const value = leaf.attributes[i][1];

                  if( typeof value == 'string' && value.indexOf( ComponentParser.pointerToReactive ) >= 0 ){
                        props[leaf.attributes[i][0]] = args[idx + numOfArgs];
                        boundKeys.push(leaf.attributes[i][0])
                        numOfArgs++;
                  }else{
                        props[leaf.attributes[i][0]] = leaf.attributes[i][1];
                  }
            }

            const component = Component.__register.get( leaf.tagName )( props );
            let root;
            /**
             * @type {RenderingResult}
             */
            let res;

            if( component instanceof Component ){
                  res = dom.createComponent( 
                        component, 
                        leaf, 
                        numOfArgs < leaf.numOfInterpolations? 
                              args.slice( idx + numOfArgs, idx + leaf.numOfInterpolations ):
                              [], 
                        refToArgs, 
                        refIdx + numOfArgs 
                  );
                  root = document.createTextNode('');

                  res.tag[0].before( root );

                  res.usedArgs = 
                        res.usedArgs > numOfArgs? 
                              res.usedArgs - numOfArgs:
                              numOfArgs;
                              
                  res.skipAttributes = true;
            }else if( isComponentList( component ) ){

                  res = dom.createComponentList( 
                        component, 
                        leaf, 
                        numOfArgs < leaf.numOfInterpolations? 
                              args.slice( idx + numOfArgs, idx + leaf.numOfInterpolations ):
                              [], 
                        refToArgs, 
                        refIdx + numOfArgs 
                  );
                  root = document.createTextNode('');

                  res.tag[0].before( root );

                  res.usedArgs = 
                        res.usedArgs > numOfArgs? 
                              res.usedArgs - numOfArgs:
                              numOfArgs;
                  res.skipAttributes = true;
                  /*res = dom.createComponentList( component, leaf, args.slice( idx + numOfArgs, idx + leaf.numOfInterpolations ), refToArgs, refIdx + numOfArgs );
                  root = document.createTextNode('');

                  res.usedArgs -= numOfArgs;
                  res.tag[0].before( root );*/
            }else{

                  res = {
                        ...dom.createElement( leaf.tagName, leaf ),
                        needAttributes: false,
                        usedArgs: numOfArgs,
                        // skip the "skipping-phase"
                        skipAttributes: true,
                  };
                  root = res.tag[0];
            }

            //res.usedArgs += numOfArgs;    

            if( !refToArgs[ refIdx ] ){
                  refToArgs[ refIdx ] = {
                        isRegisteredComponent: true,
                        root: [root],
                        props,
                        children: leaf,
                        component: {
                              name: leaf.tagName,
                              instance: component,
                        },
                        boundKeys,
                  };
            }else{
                  refToArgs[ refIdx ].root.push(root);
            }

            return res;
      }

      /**
       * returns the html instance of the component passed as input
       * @param {Readonly<Tree>} leaf
       * @param {unknown[]} args
       * @param {number} idx 
       * @param {number} refIdx represents the index used by refToArgs
       * @param {Args[]} refToArgs
       * @returns {RenderingResult}
       */
      #createElement( leaf, args, idx, refToArgs, refIdx ) {


            if( Component.__register.has( leaf.tagName ) ){
                  return this.#createRegisteredElement( leaf, args, idx, refToArgs, refIdx );
            }

            const value = args[idx];

            if( leaf.tagName !== ComponentParser.pointerToReactive ){

                  return {
                        ...dom.createElement( leaf.tagName, leaf ),
                        usedArgs: 0,
                  };
            }

            if( value instanceof Component ){
                  
                  const res = dom.createComponent( value, leaf, args.slice( idx + 1, leaf.numOfInterpolations + 1 ), refToArgs, refIdx );
                  const root = document.createTextNode('');

                  res.tag[0].before( root );

                  if( !refToArgs[ refIdx ] ){
                        refToArgs[ refIdx ] = {
                              isComponent: true,
                              root: [root],
                              children: leaf,
                        };
                  }else{
                        refToArgs[ refIdx ].root.push(root);
                  }
                  return res;
            }else if( isComponentList( value ) ){
                  const res = dom.createComponentList( value, leaf, args.slice( idx + 1, leaf.numOfInterpolations + 1 ), refToArgs, refIdx );
                  const root = document.createTextNode('');

                  res.tag[0].before( root );

                  if( !refToArgs[ refIdx ] ){
                        refToArgs[ refIdx ] = {
                              isComponent: true,
                              root: [root],
                              children: leaf,
                        };
                  }else{
                        refToArgs[ refIdx ].root.push(root);
                  }
                  return res;
            }else if( value instanceof Signal ){
                  const { unsubscribe, res } = dom.createFromAnyReactive( value, value.value, leaf, args, idx, refToArgs, refIdx );
                  List.append(
                        this.#subs,
                        unsubscribe,
                  );

                  if( !refToArgs[refIdx].subscription ){
                        refToArgs[ refIdx ].subscription = [this.#subs.head];
                  }else{
                        refToArgs[ refIdx ].subscription.push(this.#subs.head);
                  }
                  
                  return res;
            }else if( value instanceof Effect ){
                  const { unsubscribe, res } =  dom.createFromAnyReactive( value, value.state, leaf, args, idx, refToArgs, refIdx );

                  List.append(
                        this.#subs,
                        unsubscribe,
                  );

                  if( !refToArgs[refIdx].subscription ){
                        refToArgs[ refIdx ].subscription = [this.#subs.head];
                  }else{
                        refToArgs[ refIdx ].subscription.push(this.#subs.head);
                  }
                  return res;
            }

            const res = dom.createElement( /**@type {string}*/(value), leaf );

            if( !refToArgs[ refIdx ] ){
                  refToArgs[ refIdx ] = {
                        isTagName: true,
                        root: [res.tag[0]],
                        isTextNode: leaf.isTextNode,
                  };
            }else{
                  refToArgs[ refIdx ].root.push(res.tag[0]);
            }

            return {
                  ...res,
                  usedArgs: 1,

            };
      }

      /**
       * 
       * @param {HTMLElement} tag 
       * @param {[string,unknown][]} attributes 
       * @param {unknown[]} args 
       * @param {number} idx 
       * @param {number} refIdx represents the index used by refToArgs
       * @param {Args[]} refToArgs
       * @returns {number} 
       */
      #setAttributes( tag, attributes, args, idx, refToArgs, refIdx ){

            for( let i = 0; i < attributes.length; i++ ){

                  if( attributes[i][1] == ComponentParser.pointerToReactive ){

                        const arg = args[idx];

                        if( arg instanceof Signal ){
                              tag.setAttribute( attributes[i][0], /**@type {string}*/(arg.value) );

                              const unsubscribe = arg.subscribe({
                                    isComponent: false,
                                    attribute: attributes[i][0],
                                    root: tag,
                                    attributeValue: true,
                                    tagName: false,
                                    isTextNode: false,
                              });

                              List.append(
                                    this.#subs,
                                    unsubscribe,
                              );

                              if( !refToArgs[ refIdx ] ){
                                    refToArgs[ refIdx ] = {
                                          attribute: attributes[i][0],
                                          root: [tag],
                                          isAttributeValue: true,
                                          isSubscription: true, 
                                          subscription: [this.#subs.head],
                                    };
                              }else{
                                    refToArgs[refIdx].root.push(tag);
                                    refToArgs[refIdx].subscription.push(this.#subs.head);
                              }

                              

                        }else if( arg instanceof Effect ){
                              const unsubscribe = arg.subscribe({
                                    isComponent: false,
                                    attribute: attributes[i][0],
                                    root: tag,
                                    attributeValue: true,
                                    tagName: false,
                                    isTextNode: false,
                              });

                              List.append(
                                    this.#subs,
                                    unsubscribe,
                              );

                              tag.setAttribute( attributes[i][0], /**@type {string}*/(arg.state) );

                              if( !refToArgs[ refIdx ] ){
                                    refToArgs[ refIdx ] = {
                                          attribute: attributes[i][0],
                                          root: [tag],
                                          isAttributeValue: true,
                                          isSubscription: true, 
                                          subscription: [this.#subs.head],
                                    };
                              }else{
                                    refToArgs[refIdx].root.push(tag);
                                    refToArgs[refIdx].subscription.push(this.#subs.head);
                              }
                              
                        }else if( typeof arg == 'function' && attributes[i][0][0] == '@' ){
                              // attribute is an event
                              tag.addEventListener( attributes[i][0].slice(1), e => arg(e) );


                              if( !refToArgs[ refIdx ] ){
                                    refToArgs[ refIdx ] = {
                                          attribute: attributes[i][0],
                                          root: [tag],
                                          isEvent: true,
                                    };
                              }else{
                                    refToArgs[refIdx].root.push(tag);
                              }

                        }else if( isRef( arg ) ){
                              arg.element = tag;
                              

                              if( !refToArgs[ refIdx ] ){
                                    refToArgs[ refIdx ] = {
                                          root: [tag],
                                          isRef: true,
                                          ref: arg,
                                    };
                              }else{
                                    refToArgs[refIdx].root.push(tag);
                              }
                        }else if( isScopedCss( arg ) ){
                              this.#cssKeys.push( arg.__css__Key );

                              if( !refToArgs[ refIdx ] ){
                                    refToArgs[ refIdx ] = {
                                          root: [tag],
                                          isCssKey: true,
                                    };
                              }else{
                                    refToArgs[refIdx].root.push(tag);
                              }

                        }else{
                              tag.setAttribute( attributes[i][0], /**@type {string}*/(arg) );
                        }

                        idx++;
                        refIdx++;
                  }else{
                        tag.setAttribute( attributes[i][0], /**@type {string}*/(attributes[i][1]) );
                  }
            }

            // add all the keys that scopes the components style
            this.#cssKeys.length && tag.classList.add( ...this.#cssKeys );
            
            return idx;
      }

      /**
       * 
       * @param {Tree[]} tree 
       * @param {Children} children
       * @param {unknown[]} args 
       * @param {number} idx 
       * @param {number} refIdx represents the index used by refToArgs
       * @param {Args[]} refToArgs represent the reference to that links an arg to the actual dom leaf
       * @throws {DOMException} if a children with attributes/children is found
       */
      #createDOMRecursive( tree, children, args, idx, refToArgs, refIdx ) {

            // the list containing the children 
            // of the component who invoked the createDOMRecursive
            const fatherList = [];

            for( let i = 0; i < tree.length; i++ ){
                  // current leaf
                  // used to have type inference with ts
                  const leaf = tree[ i ];

                  // if the leaf is a placeholder
                  if( isChildrenLeaf( leaf, args[idx] ) ){

                        if( leaf.children.length > 0 || leaf.attributes.length > 0 ){
                              throw new DOMException("'Children' tag must be self-closing without attributes")
                        }

                        // children.args are the args of the component which contains the 
                        // custom component we are rendering now

                        // render the children of a custom component
                        // don't change children.idx to be ab le to use 
                        // multiple children
                        const { childList: list, idx: _ } = this.#createDOMRecursive( children.tree, {
                              tree: [],
                              args: [],
                              refToArgs: [],
                              idx: 0,                             
                        }, children.args, 0, children.refToArgs, children.idx );


                        // we DON'T want to change children.idx
                        // because it can be reused later for another <Children/> element

                        // and then add it as normal tags
                        fatherList.push( ...list );
                        continue;
                  }

                  const { 
                        tag: tagList, 
                        needAttributes, 
                        usedArgs,
                        skipAttributes
                  } = this.#createElement( leaf, args, idx, refToArgs, refIdx );

                  fatherList.push( ...tagList );

                  idx += usedArgs;
                  refIdx += usedArgs;


                  if( needAttributes ){
                        const usedArgs = this.#setAttributes( 
                              /**@type {HTMLElement}*/(tagList[0]), 
                              leaf.attributes, 
                              args, 
                              idx,
                              refToArgs,
                              refIdx
                        );

                        // number of attributes that require 
                        // args
                        refIdx += (usedArgs - idx);
                        idx = usedArgs;
                  }else if( !skipAttributes ){
                        for( let j = 0; j < leaf.attributes.length; j++ ){
                              if( leaf.attributes[j][1] == ComponentParser.pointerToReactive ){

                                    // we are not interested in the root here
                                    // just skip checking
                                    refToArgs[refIdx] = {
                                          root: [],
                                          attribute: leaf.attributes[j][0],
                                          isAttributeValue: true,
                                    };

                                    idx++;
                                    refIdx++;
                              }
                        }
                  }

                  // if the tag have children,
                  // but the tagList is > 1, than is a custom component,
                  // so we already rendered the children
                  if( tagList.length == 1 ){
                        // we only have one component

                        if( leaf.children.length ){
                              const { childList, idx: index } = this.#createDOMRecursive( leaf.children, children, args, idx, refToArgs, refIdx );

                              refIdx += (index - idx);
                              /**@type {HTMLElement}*/(tagList[0]).append(...childList);
                              idx = index;
                        }
                  }
            }


            return {
                  childList: fatherList,
                  idx
            };
      }

      /**
       * removes subscriptions, refs (etc...) from the args
       * @param {number} i
       */
      #clearReferences( i ){
            if( this.#refToArgs[i].isSubscription ){
                  // if it fails,
                  // the problem could the fact that the subscription is not linked
                  // watch dom.createFromAnyReactive for debugging purposes

                  const subs = this.#refToArgs[i].subscription;
                  for( let j = 0; j < subs.length; j++ ){
                        subs[j].value();
                        List.remove( 
                              this.#subs, 
                              subs[j] 
                        );
                  }
                  
            }else if( this.#refToArgs[i].isRef ){
                  // free the reference
                  this.#refToArgs[i].ref.element = null;
            }else if( this.#refToArgs[i].isEvent ){

                  const roots = this.#refToArgs[i].root;

                  for( let j = 0; j < roots.length; j++ ){

                        roots[j].removeEventListener( 
                              this.#refToArgs[i].attribute,
                              /**@type {(e: Event)=>void}*/(this.#args[i])
                        );
                  }
            }

      }
      /**
       * if the old arg is different from the new arg, it updates it and mark
       * the corresponding refToArgs as dirty, so that the fw 
       * now where it needs to update.
       * @param  {...unknown} args 
       * @returns {number[]}
       */
      #updateInternalState( ...args ){

            const toUpdate = [];

            for( let i = 0; i < args.length; i++ ){
                  const self = this.#args[i];
                  const other = args[i];


                  if( this.#refToArgs[i].isRegisteredComponent ){
                        // skip the component used properties

                        for( let j = 0; j < this.#refToArgs[i].boundKeys.length; j++ ){
                              this.#refToArgs[i].props[this.#refToArgs[i].boundKeys[j]] = args[ i + j ];
                        }

                        const self = this.#refToArgs[i].component.instance;
                        const other = Component.__register.get( this.#refToArgs[i].component.name )( this.#refToArgs[i].props );


                        if( self.isEqualTo( other ) ){
                              self.update( this.#refToArgs[i].props );
                        }else{
                              self.dispose();
                              this.#refToArgs[i].component.instance = other;
                        }
                        i += this.#refToArgs[i].boundKeys.length;
                  }

                  if( self == other || 
                        typeof self == 'object' && 
                        typeof other == 'object' && 
                        !(self instanceof Component) &&
                        !(other instanceof Component) && 
                        !isComponentList(self) &&
                        !isComponentList(other)
                  ){
                        continue;
                  }

                  toUpdate.push(i);


                  if( self instanceof Component && other instanceof Component ){

                        if( self.isEqualTo( other ) ){
                              self.update( ...other.#args );
                        }else{
                              self.dispose();
                              this.#args[i] = other;
                        }
                  }else if( isComponentList( self ) && isComponentList( other ) ){
                        const minLen = other.length < self.length ?
                              other.length : 
                              self.length;

                        for( let j = 0; j < minLen; j++ ){
                              const s = self[j];
                              const o = other[j];

                              if( !(s instanceof Component) || !(o instanceof Component) )
                                    throw new TypeError( "array of components must be homogeneous" );

                              if( s.isEqualTo( o ) ){
                                    s.update( ...o.#args );
                              }else{
                                    s.dispose();

                                    self[j] = o;
                              }
                        }

                        if( minLen == other.length ){

                              for( let j = minLen; j < self.length; j++ ){
                                    const s = self[j];       
                                    if( !(s instanceof Component) )
                                          throw new TypeError( "array of components must be homogeneous" );
                                    s.dispose();
                              }

                              self.length = minLen;
                        }else{
                              for( let j = minLen; j < other.length; j++ ){
                                    const o = other[j];       
                                    if( !(o instanceof Component) )
                                          throw new TypeError( "array of components must be homogeneous" );
                                    self.push( o );
                              }
                        }
                  }else{
                        if( other instanceof Component ){
                              // delete the subscription
                              this.#clearReferences( i );

                              this.#refToArgs[i] = {
                                    isComponent: true,
                                    root: this.#refToArgs[i].root,
                              }
                        }else if( isComponentList( other ) ){
                              // delete the subscription
                              this.#clearReferences( i );

                              this.#refToArgs[i] = {
                                    isComponent: true,
                                    root: this.#refToArgs[i].root,
                              }
                        }else if( other instanceof Signal || other instanceof Effect ){
                              // delete the subscription
                              this.#clearReferences( i );

                              this.#refToArgs[i].isSubscription = true;
                              this.#refToArgs[i].subscription = [];

                              for( let j = 0; j < this.#refToArgs[i].root.length; j++ ){
                                    const unsubscribe = other.subscribe({
                                          isComponent: this.#refToArgs[i].isComponent,
                                          root: this.#refToArgs[i].root[i],
                                          tagName: this.#refToArgs[i].isTagName,
                                          attributeValue: this.#refToArgs[i].isAttributeValue,
                                          attribute: this.#refToArgs[i].attribute,
                                          isTextNode: this.#refToArgs[i].isTextNode,
                                    });

                                    List.append(
                                          this.#subs,
                                          unsubscribe
                                    );

                                    this.#refToArgs[i].subscription.push( this.#subs.head );
                              }
                        }else if( isRef( other ) ){

                              this.#clearReferences( i );

                              this.#refToArgs[i] = {
                                    isRef: true,
                                    root: this.#refToArgs[i].root,
                              };
                        }else if( 
                              this.#refToArgs[i].isTextNode || 
                              this.#refToArgs[i].isTagName || 
                              this.#refToArgs[i].isAttributeValue || 
                              this.#refToArgs[i].isEvent
                        ){
                              this.#clearReferences( i );
                        }else if( !this.#refToArgs[i].isCssKey ){
                              throw new TypeError("no match for the type you are interpolating");
                        }

                        this.#args[i] = other;
                  }
            }

            return toUpdate;
      }

      /**
       * update every arg that is not a component.
       * this is done to not cause precedence problems 
       * with children
       * @param {readonly number[]} toUpdate 
       */
      #updateAttributes( toUpdate ){
            const components = [];


            for( let j = 0; j < toUpdate.length; j++ ){


                  const i = toUpdate[j];
                  const self = this.#args[i];
                  const roots = this.#refToArgs[i].root;
                  let value = self;


                  if(  self instanceof Effect ){
                        value = self.state;
                  }else if( self instanceof Signal ){
                        value = self.value;
                  }

                  if( this.#refToArgs[i].isComponent ){
                        components.push( i );
                  }else if( this.#refToArgs[i].isEvent ){

                        for( let i = 0; i < roots.length; i++ ){
                              roots[i].addEventListener( 
                                    this.#refToArgs[i].attribute, 
                                    /**@type {(e: Event)=>void}*/(self) 
                              );
                        }

                  }else if( this.#refToArgs[i].isAttributeValue ){
                        for( let i = 0; i < roots.length; i++ ){
                              
                              /**@type {HTMLElement}*/(roots[i]).setAttribute( 
                                    this.#refToArgs[i].attribute,
                                    /**@type {string}*/(value)
                              );
                        }
                  }else if(  this.#refToArgs[i].isRef ){
                        // only the last root is used
                        //@ts-ignore
                        self.element = roots.at(-1);
                  }else if(  this.#refToArgs[i].isTextNode ){

                        for( let i = 0; i < roots.length; i++ ){
                              roots[i].textContent = /**@type {string}*/(value)
                        }
                  }else if(  this.#refToArgs[i].isTagName ){
                        for( let i = 0; i < roots.length; i++ ){

                              const node = document.createElement( /**@type {string}*/(value) );
                              const attrib = /**@type {HTMLElement}*/(roots[i]).attributes;
                              
                              for( let i = 0; i < attrib.length; i++ ){
                                    node.setAttribute(
                                          attrib[i][0],
                                          attrib[i][1]
                                    );
                              }
                        }
                  }

            }

            return components;
      }

      /**
       * update all the args that **are** components.
       * @param {readonly number[]} components 
       */
      #updateComponents( components ){
            // update all the components
            // is done backward because first we need to update
            // possible children of other components
            for( let i = components.length - 1; i >= 0 ; i-- ){
                  const idx = components[i];
                  const self = this.#args[idx];
                  const desc = this.#refToArgs[idx];

                  

                  if( self instanceof Component ){
                        desc.root.at(-1).after( 
                              ...self.render({
                                    tree: desc.children.children,
                                    args: this.#args.slice( idx + 1, desc.children.numOfInterpolations + 1 ),
                                    refToArgs: [],
                                    idx: 0,
                              })
                        );
                  }else if( isComponentList( self ) ){
                        const tree = [];

                        for( let i = 0; i < self.length; i++ ){
                              tree.push(...self[i].render({
                                    tree: desc.children.children,
                                    args: this.#args.slice( idx + 1, desc.children.numOfInterpolations + 1 ),
                                    refToArgs: [],
                                    idx: 0,
                              }));
                        }

                        desc.root.at(-1).after( ...tree );

                  }

            }
      }

      /**
       * @param {Children} children 
       * @return {HTMLElement[]}
       */
      render( children ){
            if( this.#root && this.#root.length > 0 ){
                  
                  for( let i = 0; i < this.__mount.length; i++ ){
                        this.__mount[i]()
                  }
                  return /**@type {HTMLElement[]}*/([...this.#root]);
            }

            try{
                  
                  const {
                        idx: _,
                        childList
                  } = this.#createDOMRecursive( 
                        this.#tree, 
                        children, 
                        this.#args,
                        0, 
                        this.#refToArgs, 
                        0 
                  );

                  this.#root = childList;
      
                  const tree = /**@type {HTMLElement[]}*/([...this.#root]);

                  for( let i = 0; i < this.__mount.length; i++ ){
                        this.__mount[i]()
                  }
                  
                  return tree;
            }catch(e){
                  for( let i = 0; i < this.__error.length; i++ ){
                        this.__error[i]( e ); 
                  }
                  console.error( e );
            }

            return [];
      }

      /**
       * for all(args) if arg[i] != old(arg[i]) => update
       * if the arg is a component of the same type as the old one, require update, 
       * otherwise change component
       * @param  {...unknown} args 
       */
      update( ...args ){
            try{
                  /**
                   * all the args (indices) that needs update
                   * @type {readonly number[]}
                   */
                  const toUpdate = this.#updateInternalState( ...args );
                  /**
                   * it is used to update components after all the other args 
                   * (in backward). this is done for components-children update
                   * @type {readonly number[]}
                   */
                  const components = this.#updateAttributes( toUpdate );
                  this.#updateComponents( components );
            }catch( e ){
                  for( let i = 0; i < this.__error.length; i++ ){
                        this.__error[i]( e );
                  }
            }     
      }

      /**
       * dispose a component by unsubscribing all it's dependencies and
       * by removing all the tree associated with it from the dom
       */
      dispose(){
            let curr = this.#subs.head;

            // unsubscribe from all the reactive bindings
            while( curr ){
                  curr.value();
                  curr = curr.next;
            }

            // remove all the tree from the dom
            for( let i = 0; i < this.#root.length; i++ ){
                  this.#root[i].remove();
            }

            for( let i = 0; i < this.__dispose.length; i++ ){
                  this.__dispose[i]();
            }

      }

      /**
       * @param {Component} other 
       */
      isEqualTo( other ){

            if( this.#tree == other.#tree ){
                  return true;
            }

            return false;
      }
}