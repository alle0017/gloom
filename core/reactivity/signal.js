import * as List from "./list.js";
import is from "../template/typeguard.js";
import Effect from "./effect.js";

/**
 * @template T
 */
export default class Signal {

      /**
       * @type {ListRoot<Subscriber>}
       */
      #subs = {
            head: null,
      };

      /**
       * @type {T}
       */
      #value;

      get value(){
            return this.#value;
      }

      set value( value ){



            if( value == this.#value && typeof value !== 'object' )
                  return;


            // update the component
            if( is.Component( this.#value ) ){
                  if( is.Component( value ) && this.#value.isEqualTo( value ) ){
                        this.#value.update( ...value.args );
                  }else{      
                        
                        this.#value.dispose();
                        this.#value = value;
                  }
            }else if( is.ComponentList( this.#value ) ){

                  if( is.ComponentList( value ) ){

                        const minLen = this.#value.length > value.length ? 
                              value.length : 
                              this.#value.length;

                        for( let i = 0; i < minLen; i++ ){
                              if( this.#value[i].isEqualTo( value[i] ) ){
                                    this.#value[i].update( ...value[i].args );
                              }else{
                                    this.#value[i].dispose();
                                    this.#value[i] = value[i];
                              }
                        }

                        if( minLen == value.length ){
                              for( let i = minLen; i < this.#value.length; i++ ){
                                    this.#value[i].dispose();
                              }  

                              this.#value.splice( minLen, this.#value.length - minLen );
                        }else{
                              this.#value.push( ...value.slice( minLen ) );
                        }


                  }else{    
                        for( let i = 0; i < this.#value.length; i++ ){
                              this.#value[i].dispose();
                        }  
                        this.#value = value;
                  }
            }else{
                  this.#value = value;
            }

            this.#notifyAll();
      }


      #notifyAll(){

            let curr = this.#subs.head;

            while( curr ){
                  curr.value.update();
                  curr = curr.next;
            }

      }

      /**
       * 
       * @param {T} value 
       */
      constructor( value ){
            this.#value = value;
      }

      /**
       * return the function used to unsubscribe the subscription
       * @param {ReactiveRef} ref 
       */
      subscribe( ref ){


            if( ref.isComponent ){
                  const desc = /**@type {ComponentRef} */(ref);

                  // can be only a component (not even a list of components)
                  List.append(
                        this.#subs,{
                              update: () => {
                  
                                    if( is.ComponentList( this.#value ) ){
            
                                          const tree = [];
            
                                          for( let i = 0; i < this.#value.length; i++ ){
                                                tree.push( ...this.#value[i].render({ args: [], tree: [], refToArgs: [], idx: 0, }) );
                                          }
            
                                          desc.root.after(...tree);
                                    }else if( is.Component( this.#value ) ){
      
                                          desc.root.after(
                                                ...this.#value.render({ args: [], tree: [], refToArgs: [], idx: 0, })
                                          );
                                    }
                              }
                        }
                  )
            }else{
                  const desc = /**@type {SimpleRef}*/(ref);
                  List.append(
                        this.#subs, {
                              update: ()=> {
                                    if( desc.isTextNode ){
                                          desc.root.textContent = /**@type {string}*/(this.#value);
                                    }else if( desc.attributeValue ){
                                          /**@type {HTMLElement}*/(desc
                                          .root)
                                          .setAttribute( 
                                                desc.attribute,  
                                                /**@type {string}*/(this.#value) 
                                          );
                                    }else{
                                          const node = document.createElement( /**@type {string}*/(this.#value) );

                                          desc.root.replaceWith( node );
                                          desc.root = node;
                                    }
                              }
                        }
                  )
            }

            const ticket = this.#subs.head;

            return () => List.remove( this.#subs, ticket );
      }

      /**
       * return the function used to unsubscribe the subscription
       * @param {Subscriber} effect
       */
      subscribeEffect( effect ){
            List.append(
                  this.#subs, 
                  effect
            );
            const ticket = this.#subs.head;

            return () => List.remove( this.#subs, ticket );
      }

      /**
       * create an Effect that returns:
       * - the value returned by the callback invoked on the state of the signal if the signal value is not an array
       * - a list of values, returned by calling the callback on each element of the state, if the state is an array
       * the same effect can be achieved by using an effect in combination with the map function
       * @example
       * ```javascript
       * const list = $signal([]);
       * list.map( 
       *     (v,i) => TodoItem({ description: v, onDelete: () => onDelete(i) }) 
       * )
       * // is equal to
       * const renderedList = $effect(
       *    () => list.value.map((v,i) => TodoItem({ description: v, onDelete: () => onDelete(i) }) ),
       *    list
       * )
       * ```
       * @template V
       * @param {T extends Array<infer K> ? (v: K, index: number) => V : (v: T) => V } callback 
       */
      map( callback ){
            
            return new Effect(
                  () =>{ 

                        if( this.#value instanceof Array ){
                              const res = [];

                              for( let i = 0; i < this.#value.length; i++){
                                    res.push( callback( this.#value[i], i ) )
                              }
                              return res;
                        }else{
                              //@ts-ignore
                              return callback( this.#value )
                        }
                  },
                  this,
            )
            
      }
}
