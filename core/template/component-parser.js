export default class ComponentParser {

      /**
       * it starts with a strange sequence for regular text. This is done for 
       * the parsing stage, to check if is regular text or is a keyword. If the compared text is not
       * this keyword, the check should end in maximum 4 characters.
       * @readonly
       */
      static #pointerToReactive = '£:_--pRiVaTe__REACTIVE_PTR__v0\.0\/2024£';

      /**
       * @readonly
       */
      static #tagRegex = new RegExp(`<\\s*(${this.#pointerToReactive}|([a-zA-Z][a-zA-Z0-9-]*))(\\s+(${this.#pointerToReactive}|@?[a-zA-Z_:][a-zA-Z0-9_.:-]*)(\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]*))?)*\\s*\/?>`);
      /**
       * @readonly
       */
      static #tagAttrRegex = new RegExp(`((${this.#pointerToReactive})|@?[a-zA-Z_:][a-zA-Z0-9_\.:-]*)\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]*))|([a-zA-Z_:][a-zA-Z0-9_.:-]*)`, 'g');
      /**
       * @readonly
       */
      static #tagNameRegex = new RegExp(`<\\s*(${this.#pointerToReactive}|([a-zA-Z][a-zA-Z0-9-]*))`);
      /**
       * @readonly
       */
      static #closingTagRegex = /<\/\s*[a-zA-Z][a-zA-Z0-9-]*\s*>/;
      /**
       * @readonly
       */
      static #selfClosingTagRegex = /\s*\/>/;

      static get pointerToReactive(){
            return this.#pointerToReactive;
      }

      /**
       * is guaranteed that if isTag is true, it returns 1 and only 1 Tree Node
       * @param {Readonly<string>} slice 
       * @returns {{ tree: Tree, isTag: boolean }}
       */
      static #parsePossibleTag( slice  ){

            const check = slice.match( ComponentParser.#tagRegex );

            if( !check || check.index !== 0 ){
                  return {
                        isTag: false,
                        tree: null
                  };
            }

            /**
             * @type {[string, string][]}
             */
            const attributes = [];
            // get the tag type
            const tagName = slice.match( ComponentParser.#tagNameRegex )[0].replace('<', '');
            // get attributes="value", or, if the match returns nul, pass empty array 
            // it also removes the tag name, to avoid the
            // case where the tag name is considered as an attribute
            const attribNameAndVal = slice.replace( new RegExp(`(${tagName})`), '' ).match( ComponentParser.#tagAttrRegex ) || [];
            let numOfInterpolations = 0;

            if( tagName == ComponentParser.#pointerToReactive ){
                  numOfInterpolations++;
            }

            for( let i = 0; i < attribNameAndVal.length; i++ ){

                  let [name, value] = attribNameAndVal[i].split( '=' );

                  
                  if( value && ( value[0] == '\'' || value[0] == '"' ) ){
                        value = value.slice( 1, value.length - 1 );
                  }

                  if( name == ComponentParser.#pointerToReactive ){
                        throw new DOMException('component cannot use interpolated attribute\'s names');
                  }

                  if( value == ComponentParser.#pointerToReactive ){
                        numOfInterpolations++;
                  }

                  attributes.push(
                        [name, value]
                  );
            }

            return {
                  isTag: true,
                  tree: {
                        isTextNode: false,
                        attributes,
                        children: [],
                        tagName,
                        reference: null,
                        numOfInterpolations,
                  }
            };
      }


      /**
       * 
       * @param {Readonly<string>} string 
       */
      static #compareWithReactivePointer( string ){
            const keyword = ComponentParser.#pointerToReactive;
            let j = 1;

            while( j < keyword.length ){
                  if( keyword[j] !== string[j] )
                        return false;
                  j++;
            }

            return true;
      }


      /**
       * @throws {ReferenceError} if the pointer keyword is used inside the template
       * @throws {DOMException} if the parsing phase notice an error. some scenarios are when a tag is closed but is never opened
       * @param {Readonly<string>} template
       * @returns {Tree[]}
       */
      static createHtmlTree( template ){

            /**
             * @type {Tree}
             */
            const root = {
                  tagName: null,
                  attributes: null,
                  children: [],
                  reference: null,
                  isTextNode: false,
                  numOfInterpolations: 0,
            };

            
            /**
             * @type {Stack<Tree>}
             */
            const stack = [ root ];


            let text = '';

            for( let i = 0; i < template.length; i++ ){

                  if( template[i] == ComponentParser.#pointerToReactive[0] && this.#compareWithReactivePointer( template.slice(i) ) ){

                        stack
                        .at( -1 )
                        .children
                        .push(
                              // the text found before
                              {
                                    children: [],
                                    isTextNode: true,
                                    tagName: text,
                                    reference: undefined,
                                    attributes: [],
                                    numOfInterpolations: 0,
                              }, 
                              // the reactive node
                              {
                                    children: [],
                                    isTextNode: true,
                                    tagName: ComponentParser.#pointerToReactive,
                                    reference: undefined,
                                    attributes: [],
                                    numOfInterpolations: 1,
                              }
                        );

                        stack
                        .at( -1 )
                        .numOfInterpolations++;

                        text = '';

                        i += ComponentParser.#pointerToReactive.length - 1;

                        continue;
                  }

                  if( template[i] == '\\' ){
                        // skip the next character
                        text += ('\\'+ template[ i + 1 ]);
                        i++;
                        continue;
                  }

                  if( template[i] == '<' ){
                        const last = template.indexOf( '>', i + 1 );

                        if( last >= 0 ){
                              const tag = template.slice( i, last + 1 );

                              if( tag.match( ComponentParser.#closingTagRegex ) ){
                                    stack
                                    .at(-1)
                                    .children
                                    .push({
                                          children: [],
                                          isTextNode: true,
                                          tagName: text,
                                          reference: undefined,
                                          attributes: [],
                                          numOfInterpolations: 0,
                                    });
                                    text = '';
                                    // we don't have to parse anything, just pop what was the last opened tag
                                    const tree = stack.pop();

                                    stack
                                    .at(-1)
                                    .numOfInterpolations += tree.numOfInterpolations;
                                    
                                    
                                    if( stack.length < 1 )
                                          throw new DOMException('Invalid closing tag in template');
                                    // we already analyzed until last index
                                    i = last;
                                    continue;
                              }

                              const res = this.#parsePossibleTag( tag );

                              if( !res.isTag ){
                                    text += template[i];
                                    continue;
                              }

                              stack
                              .at( -1 )
                              .children
                              .push({
                                    children: [],
                                    isTextNode: true,
                                    tagName: text,
                                    reference: undefined,
                                    attributes: [],
                                    numOfInterpolations: 0,
                              }, res.tree);


                              if( !tag.match( ComponentParser.#selfClosingTagRegex ) ){
                                    // if it's self closing tag, 
                                    //it doesn't need to be pushed inside the stack
                                    //pathToReactive.push( stack.at(-1).children.length - 1 );
                                    stack.push( res.tree );
                              }else{
                                    stack
                                    .at( -1 )
                                    .numOfInterpolations += res.tree.numOfInterpolations;
                              }

                              // clean up the already-processed text
                              text = '';

                              // we already analyzed until last index
                              i = last;

                              continue;
                        }
                  }

                  text += template[i];
            }

            root
            .children
            .push({
                  children: [],
                  isTextNode: true,
                  tagName: text,
                  reference: undefined,
                  attributes: [],
                  numOfInterpolations: 0,
            });


            return root.children;
      }
      /**
       * @param {TemplateStringsArray} strings 
       * @returns {string}
       */
      static reduceTemplateStringArray( strings ){
            return strings.reduce( (p,c) =>{ 
                  if( c.indexOf( ComponentParser.#pointerToReactive ) >= 0 ){
                        throw new ReferenceError( 
                              ComponentParser.#pointerToReactive +
                              " is a private keyword. consider using other words instead or escaping it with codes." 
                        );
                  }
                  return p + ComponentParser.#pointerToReactive + c;
            });
      }
}