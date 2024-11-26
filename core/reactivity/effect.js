import * as List from "./list.js";
import is from "../template/typeguard.js";
/**@import Signal from "./signal.js";*/

/**
 * @template T
 */
export default class Effect {

      /**
       * @type {T}
       */
      #state;
      /**
       * @type {number}
       */
      #refCounter = 0;
      /**
       * @readonly
       * @type {() => T}
       */
      #callback;
      /**
       * list of subscriptions
       * @type {ListRoot<ReactiveRef>}
       */
      #subs = {
            head: null,
      };
      /**
       * list of function used to unsubscribe from
       * all the dependencies
       * @type {ListRoot<() => void>}
       */
      #unsubscribe = {
            head: null,
      };

      /**
       * @readonly
       * @type {Signal<unknown>[]}
       */
      #dependencies;

      get state() {
            return this.#state;
      }

      /**
       * @param {() => T} callback 
       * @param  {...Signal<unknown>} deps 
       */
      constructor( callback, ...deps ){

            this.#dependencies = deps;
            this.#state = callback();
            this.#callback = callback;
      }

      #updateState(){
            const state = this.#callback();

            if( state && typeof state !== 'object' && this.#state == state ){
                  return;
            }


            
            // update the component
            if( is.Component( this.#state ) ){
                  if( is.Component( state ) && this.#state.isEqualTo( state ) ){
                        this.#state.update( ...state.args );
                  }else{      
                        this.#state.dispose();
                        this.#state = state;
                  }
            }else if( is.ComponentList( this.#state ) ){

                  if( is.ComponentList( state ) ){

                        const minLen = this.#state.length > state.length ? 
                              state.length : 
                              this.#state.length;

                        for( let i = 0; i < minLen; i++ ){
                              if( this.#state[i].isEqualTo( state[i] ) ){
                                    this.#state[i].update( ...state[i].args );
                              }else{
                                    this.#state[i].dispose();
                                    this.#state[i] = state[i];
                              }
                        }

                        if( minLen == state.length ){
                              for( let i = minLen; i < this.#state.length; i++ ){
                                    this.#state[i].dispose();
                              }  

                              this.#state.splice( minLen, this.#state.length - minLen );
                        }else{
                              this.#state.push( ...state.slice( minLen ) );
                        }


                  }else{    
                        for( let i = 0; i < this.#state.length; i++ ){
                              this.#state[i].dispose();
                        }  
                        this.#state = state;
                  }
            }else{
                  this.#state = state;
            }
      }
      /**
       * return the function used to unsubscribe the subscription
       * @param {ReactiveRef} ref 
       */
      subscribe( ref ){

            if( this.#refCounter <= 0 ){
                  for( let i = 0; i < this.#dependencies.length; i++ ){
                        List.append(
                              this.#unsubscribe,
                              this.#dependencies[i].subscribeEffect( this )
                        );
                  }
            }
            
            List.append(
                  this.#subs,
                  ref,
            );

            this.#refCounter++;

            const ticket = this.#subs.head;

            return () => {
                  this.#refCounter--;

                  List.remove(
                        this.#subs,
                        ticket
                  );

                  if( this.#refCounter <= 0 ){
                        let curr = this.#unsubscribe.head;

                        while( curr ){
                              // unsubscribing from all the effects
                              curr.value();
                              curr = curr.next;
                        }

                        this.#unsubscribe.head = null;
                  }
            };
      }

      /**
       * update will work as follows:
       * there will be a variable called refCounter,
       * that tracks the number of components linked to this effect.
       * if the effect reaches 0 refCount, it unsubscribe from every signal associated with
       * it. on update, it will call the callback associated with the method, then it will update
       * all the components linked to it
       */
      update(){
            
            this.#updateState();

            let curr = this.#subs.head;

            while( curr ){
                  if( curr.value.isComponent ){
                        const desc = /**@type {ComponentRef}*/(curr.value);

                        if( is.ComponentList( this.#state ) ){

                              const tree = [];

                              for( let i = 0; i < this.#state.length; i++ ){
                                    tree.push( ...this.#state[i].render({ args: [], tree: [], refToArgs: [], idx: 0, }) );
                              }

                              desc.root.after(...tree);
                        }else if( is.Component( this.#state ) ){

                              desc.root.after(
                                    ...this.#state.render({ args: [], tree: [], refToArgs: [], idx: 0, })
                              );
                        }
                  }else{
                        const desc = /**@type {SimpleRef}*/(curr.value);

                        if( desc.attributeValue ){
                              /**@type {HTMLElement}*/(desc.root).setAttribute( desc.attribute, /**@type {string}*/(this.#state) );
                        }else if( desc.isTextNode ){
                              /**@type {Text}*/(desc.root).textContent = /**@type {string}*/(this.#state);
                        }else{
                              const node = document.createElement( /**@type {string}*/(this.#state) );
                              desc.root.replaceWith( node );
                              desc.root = node;
                        }
                  }
                  
                  curr = curr.next;
            }
      }   
}