interface Stack<T> {
      push(...value: T[]): void;
      pop(): T;
      at(index: -1): T;
      length: number;
}

interface Subscriber {
      update(): void;
}

interface Reactive {
      subscribe( ref: ReactiveRef ): () => void;
}


interface Drawable {
      dispose(): void;
      update( ...newArgs: unknown[] ): void;
      render( children: Children ): HTMLElement[];
}

type ListNode<T> = {
      prev: ListNode<T>;
      next: ListNode<T>;
      value: T;
}

type ListRoot<T> = {
      head: ListNode<T>;
}

type Children = {
      tree: Tree[],
      args: unknown[],

      // used to update the component without rerendering the tree
      refToArgs: Args[],
      idx: number,
}
type RenderingResult = {
      tag: HTMLElement[] | Text[];
      needAttributes: boolean;
      usedArgs: number;
      // not only it doesn't need to 
      // use attributes, but need to skip the 
      // "skip unutilized interpolations"
      skipAttributes: boolean;
}
/*
type Effect<T> = {
      Signal: T,
      _subs: [],
      _refCount: number,

      update: () => void,
      subscribe: () => void,
      unsubscribe: () => void,
}*/


type ComponentRef = {
      isComponent: true,
      //ref: Drawable | Drawable[],
      root: HTMLElement | Text,
}
type SimpleRef = {
      isComponent: false,
      root: HTMLElement|Text; 
      tagName: boolean;
      attributeValue: boolean;
      attribute: string;
      isTextNode: boolean;
}
type ReactiveRef =  ComponentRef | SimpleRef;

type Tree = {
      attributes: [string,unknown][],
      children: Array<Tree>,
      isTextNode: boolean,
      tagName: string,
      reference: HTMLElement | Text,
      numOfInterpolations: number,
}

type ArgFlags = {
      // if one is true, the others must be false
      // exclusive
      isComponent: boolean,
      isTagName: boolean;
      isAttributeValue: boolean;
      isTextNode: boolean;
      isRef: boolean;
      isSubscription: boolean;
      isEvent: boolean;
      isCssKey: boolean;
      isRegisteredComponent: boolean;
}
type Args = {
      // required
      root: Array<HTMLElement | Text>,

      // optional - required for some of the flags
      attribute?: string;
      subscription?: ListNode<()=>void>[];
      ref?: Ref<HTMLElement>;
      children?: Tree;
      props?: Record<string, unknown>
      component?: {
            name: string
            instance: import("./template/component").default;
      };
      boundKeys?: string[]
} & Partial<ArgFlags>;

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

