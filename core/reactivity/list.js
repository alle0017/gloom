/**
 * @template T
 * @param {T} value 
 * @returns {ListNode<T>}
 */
const createNode = value =>{
      return {
            prev: null,
            next: null,
            value,
      }
}
/**
 * @template T
 * @param {T} value 
 * @param {ListRoot<T>} list 
 */
export const append = (list, value) => {
      const node = createNode(value);
      
      if( !list.head ){
            list.head = node;
      }else{
            list.head.prev = node;
            node.next = list.head;
            list.head = node;
      }
}

/**
 * @template T
 * @param {ListRoot<T>} list 
 * @param {ListNode<T>} node 
 * @returns {T}
 */
export const remove = (list, node) => {
      if( !node.prev ){
            list.head = node.next;
      }else{
            node.prev.next = node.next;
            node.next.prev = node.prev;
      }
      return node.value;
}