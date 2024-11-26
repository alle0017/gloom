class CssParser {
      static #keyId = Math.trunc( Math.random() * 5760 + Math.random() * 1254 + 4578 );
      /**
       * @type {HTMLStyleElement}
       */
      static #styleRoot;
      /**
       * note, this is 
       * a CSS class
       * @readonly
       */
      static #key = '.--Component--Scope__Key__';
      /**
       * holds the key of the style.
       * the style is the key of the hashmap
       * @type {Map<string,ScopedCss>}
       */
      static #styleCache = new Map();

      /**
       * @readonly
       * @type {string}
       */
      #css;
      /**
       * @type {string}
       */
      #styleKey;

      /**
       * 
       * @param {string} css 
       */
      constructor(css){
            this.#css = css.replace( /\s+/ig, ' ' );
      }

      /**
       * returns the next same-level selector. the index is the index of the last '}'
       * @param {number} styleStart 
       * @param {string} cssString 
       */
      #getNextSelectorIndex( styleStart, cssString ){
            // skip the inside
            let openBrackets = 1;
            // the first character is '{'
            let j = styleStart + 1;


            while( openBrackets > 0 && j < cssString.length ){
                  if( cssString[j] == '}' ){
                        openBrackets--;
                  }else if( cssString[j] == '{' ){
                        openBrackets++;
                  }
                  j++;
            }

            return j;
      }

      /**
       * 
       * @param {string} selectors 
       */
      #scopeSelectors( selectors ) {

            return selectors
            .split( /([,&>|+~ <])(?!\=)/ig )
            .map( v =>{

                  if( !v.length || (v.match(/([,&>|+~ <])/) && v.length == 1) )
                        return v;


                  if( v.indexOf('[') >= 0 || v.indexOf(':') >= 0 ){
                        return v.replace(/[a-zA-Z0-9_-][\[:]/, m => m[0] + this.#styleKey + m[1] );
                  }

                  return v + this.#styleKey;
            }).reduce( (p,c) => p + c );
      }     

      /**
       * 
       * @param {string} cssString 
       * @returns 
       */
      #scope( cssString ){

            let res = '';
            let i = 0;

            while( i < cssString.length ){

                  const styleStart = cssString.indexOf( '{', i );

                  if( i < 0 ){
                        // no more styles to parse
                        return res + cssString.slice( i );
                  }

                  // contains all the selectors that 
                  // we want to scope
                  const sel = cssString.slice( i, styleStart );

                  // fuck, is a media query
                  // we need to parse it's inside :'(
                  if( sel.indexOf('@media') >= 0 ){


                        const next = this.#getNextSelectorIndex( styleStart, cssString );

                        const scoped = this.#scope( 
                              cssString.slice( styleStart + 1, next )
                        );

                        res += sel + '{' + scoped;

                        i = next + 1;
                        continue;
                  }else if( sel.indexOf('@keyframe') >= 0 ){
                        const j = this.#getNextSelectorIndex( styleStart, cssString );

                        // we want to include the last '}', 
                        // so we need to add 1 to j 
                        // (that is on the character '}')
                        res += cssString.slice( i, j + 1 );
                        i = j + 1;
                        continue;
                  }

                  let next = this.#getNextSelectorIndex( styleStart, cssString );

                  res += this.#scopeSelectors( sel ) + cssString.slice( styleStart, next + 1 );
                  i = next + 1;
            }

            return res;
      }

      scope(){
            if( CssParser.#styleCache.has( this.#css ) ){
                  return CssParser.#styleCache.get( this.#css );
            }
            // first, we need to generate a new unique key
            this.#styleKey = CssParser.#key + (CssParser.#keyId++);

            const scoped = this.#scope( this.#css );

            if( !CssParser.#styleRoot ){
                  CssParser.#styleRoot = document.createElement( 'style' );
                  CssParser.#styleRoot.type = 'text/css';
                  document.head.appendChild( CssParser.#styleRoot );
            }
            CssParser.#styleRoot.append(scoped);

            CssParser.#styleCache.set( this.#css, { 
                  __css__Key: this.#styleKey.replace('.', '')
            });

            return { 
                  __css__Key: this.#styleKey.replace('.', '')
            };
      }


}

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
export const css = ( strings, ...args ) => {
      let res = strings[0];

      for( let i = 0; i < args.length; i++ ) {
            res += args[i] + strings[i + 1];
      }

      return new CssParser( res ).scope();
}