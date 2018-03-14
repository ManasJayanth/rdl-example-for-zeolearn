import css from 'dom-helpers/style';
import Reconciler from 'react-reconciler';

const isEventRegex = /^on([A-Z][a-zA-Z]+)$/;

const RDL = Reconciler({
  getRootHostContext() {
    return '';
  },
  getChildHostContext() {
    return '';
  },
  appendInitialChild(parentInstance, child) {
    parentInstance.appendChild(child);
  },
  createInstance(
    type,
    props,
    rootContainerInstance,
    hostContext,
    internalInstanceHandle,
  ) {
    return document.createElement(type); // Node.ownerDocument is safer
  },
  createTextInstance(
    text,
    rootContainerInstance,
    hostContext,
    internalInstanceHandle,
  ) {
    return document.createTextNode(text); // Node.ownerDocument is safer
  },
  finalizeInitialChildren(
    domElement,
    type,
    props,
  ) {
    Object.keys(props).forEach(propKey => {
      const propValue = props[propKey];
      let match;
      if (propKey === 'className') {
        domElement.className = propValue;
      } else if (propKey === 'style') {
        css(domElement, propValue);
      } else if (propKey === 'children') {
        if (typeof propValue === 'string' || typeof propValue === 'number') {
          domElement.textContent = `${propValue}`;
        }
      } else if ((match = propKey.match(isEventRegex))) { // in order to match onClick, onSelect etc
        listenTo(domElement, match[1], props[propKey])
      } else if (props[propKey] !== null) {
        domElement.setAttribute(hyphenate(propKey), props[propKey]);
      }
    });
    return false;
  },
  getPublicInstance(inst) {
    return inst;
  },
  prepareForCommit() {
    // noop
  },
  prepareUpdate(
    domElement,
    type,
    oldProps,
    newProps,
  ) {
    return diffProps(domElement, oldProps, newProps) || null;
  },
  resetAfterCommit() {
    // noop
  },
  resetTextContent(domElement) {
    domElement.textContent = '';
  },
  shouldSetTextContent(type, props) {
    return (
      type === 'textarea' ||
        typeof props.children === 'string' ||
        typeof props.children === 'number'
    );
  },
  now() {
    return typeof performance === 'object' &&
      typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  },
  useSyncScheduling: true,
  scheduleDeferredCallback: window.requestIdleCallback,
  cancelDeferredCallback: window.cancelIdleCallback,
  shouldDeprioritizeSubtree: (type, props) => !!props.hidden,

  mutation: {
    commitUpdate(
      domElement,
      preparedUpdateQueue: Array<[string, any]>,
      type,
      oldProps,
    ): void {
      let match;

      for (let [propKey, propValue] of preparedUpdateQueue) {
        // inline styles!
        if (propKey === 'className') {
          domElement.className = propValue;
        } else if (propKey === 'style') {
          // Since we are using simple string for style attr
          css(domElement, propValue);
        } else if (propKey === 'children') {
          if (typeof propValue === 'string' || typeof propValue === 'number') {
            domElement.textContent = `${propValue}`;
          }

          // Add DOM event listeners
        } else if ((match = propKey.match(isEventRegex))) {
          listenTo(
            domElement,
            match[1],
            propValue
          );
        } else if (propValue != null) {
          const attributeName = hyphenate(propKey);
          if (propKey in domElement) {
            domElement[propKey] = propValue == null ? '' : propValue;
          } else if (propValue === null) {
            domElement.removeAttribute(attributeName);
          } else {
            domElement.setAttribute(
              attributeName,
              propValue === true ? '': propValue
            );
          }
        }
      }

    },
    commitMount() {
      // noop
    },

    commitTextUpdate(textInstance, oldText, newText) {
      textInstance.nodeValue = newText;
    },

    resetTextContent(domElement) {
      domElement.textContent = '';
    },

    appendChild(parentInstance, child) {
      parentInstance.appendChild(child);
    },

    appendChildToContainer(
      parentInstance,
      child,
    ) {
      parentInstance.appendChild(child);
    },
    insertBefore(
      parentInstance,
      child,
      beforeChild,
    ) {
      parentInstance.insertBefore(child, beforeChild);
    },

    insertInContainerBefore(
      container,
      child,
      beforeChild,
    ) {
      container.insertBefore(child, beforeChild);
    },

    removeChild(parentInstance, child) {
      parentInstance.removeChild(child);
    },
    removeChildFromContainer(
      parentInstance,
      child,
    ) {
      parentInstance.removeChild(child);
    },
  },
});

function hyphenate(string) {
  const rUpper = /([A-Z])/g;
  return string.replace(rUpper, '-$1').toLowerCase();
}

function diffProps(domElement, lastProps, nextProps) {
  let updatePayload = [];

  for (let propKey of Object.keys(nextProps)) {
    const nextProp = nextProps[propKey];
    const lastProp = lastProps[propKey];

    if (
      nextProp === lastProp ||
        propKey === 'style' ||
      (nextProp == null && lastProp == null)
    ) {
      // style strings are equal
      continue;
    } else if (propKey === 'children') {
      if (typeof nextProp === 'string' || typeof nextProp === 'number')
        updatePayload.push([propKey, nextProp]);
    } else {
      updatePayload.push([propKey, nextProp]);
    }
  }

  let styleUpdates = diffStyle(lastProps.style, nextProps.style);
  if (styleUpdates) {
    updatePayload.push('style', styleUpdates);
  }

  return updatePayload.length === 0 ? null: updatePayload;
}

function diffStyle(lastStyle, nextStyle) {
  let updates = null;
  if (lastStyle) {
    for (const lastKey in lastStyle) {
      if (!updates) updates = {};
      updates[lastKey] = '';
    }
  }

  if (!updates || !nextStyle) return nextStyle;

  return Object.assign(updates, nextStyle);
}

function listenTo(domElement, event, handler) {
  // Oversimplified
  if (domElement._lastHandler) {
    domElement.removeEventListener(event, domElement._lastHandler);
  }
  domElement._lastHandler = handler;
  domElement.addEventListener(event, handler);
}

export function render(reactElements, domContainer, callback) {
  // For simplicity. More correctly, only initial renders must be unbatched
  const internalRoot = RDL.createContainer(domContainer, false, false);
  return RDL.unbatchedUpdates(() => {
    RDL.updateContainer(reactElements, internalRoot, null, callback);
    return RDL.getPublicRootInstance(internalRoot);
  });
}
