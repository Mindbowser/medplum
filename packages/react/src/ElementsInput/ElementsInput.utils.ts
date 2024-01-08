import { InternalSchemaElement, InternalTypeSchema } from '@medplum/core';
import React from 'react';

/**
 * Splits a string on the last occurrence of the delimiter
 * @param str - The string to split
 * @param delim - The delimiter string
 * @returns An array of two strings; the first consisting of the beginning of the
 * string up to the last occurrence of the delimiter. the second is the remainder of the
 * string after the last occurrence of the delimiter. If the delimiter is not present
 * in the string, the first element is empty and the second is the input string.
 */
function splitOnceRight(str: string, delim: string): [string, string] {
  const delimIndex = str.lastIndexOf(delim);
  if (delimIndex === -1) {
    return ['', str];
  }
  const beginning = str.substring(0, delimIndex);
  const last = str.substring(delimIndex + delim.length);
  return [beginning, last];
}

export type ElementsContextType = {
  debugMode: boolean;
  profileUrl: string | undefined;
  /**
   * Get the element definition for the specified path if it has been modified by a profile.
   * @param nestedElementPath - The path of the nested element
   * @returns The modified element definition if it has been modified by the active profile or undefined. If undefined,
   * the element has the default definition for the given type.
   */
  getModifiedNestedElement: (nestedElementPath: string) => InternalSchemaElement | undefined;
  elements: Record<string, InternalSchemaElement>;
  elementsByPath: Record<string, InternalSchemaElement>;
};

export const ElementsContext = React.createContext<ElementsContextType>({
  profileUrl: undefined,
  debugMode: false,
  getModifiedNestedElement: () => undefined,
  elements: Object.create(null),
  elementsByPath: Object.create(null),
});

export type BuildElementsContextArgs = {
  parentContext: ElementsContextType | undefined;
  elements?: InternalTypeSchema['elements'];
  parentPath: string;
  parentType?: string;
  profileUrl?: string | undefined;
  debugMode?: boolean | undefined;
};

export function buildElementsContext({
  parentContext,
  elements,
  parentPath,
  parentType,
  profileUrl,
  debugMode,
}: BuildElementsContextArgs): ElementsContextType {
  let mergedElements: ElementsContextType['elements'] | undefined;
  if (elements && parentContext) {
    mergedElements = mergeElementsForContext(parentPath, elements, parentContext);
  }

  const nestedPaths: Record<string, InternalSchemaElement> = Object.create(null);
  const elementsByPath: ElementsContextType['elementsByPath'] = Object.create(null);

  function getModifiedNestedElement(nestedElementPath: string): InternalSchemaElement {
    return nestedPaths[nestedElementPath];
  }

  if (mergedElements) {
    const seenKeys = new Set<string>();
    for (const [key, property] of Object.entries(mergedElements)) {
      elementsByPath[parentPath + '.' + key] = property;

      const [beginning, _last] = splitOnceRight(key, '.');
      // assume paths are hierarchically sorted, e.g. identifier comes before identifier.id
      if (seenKeys.has(beginning)) {
        nestedPaths[parentType + '.' + key] = property;
      }
      seenKeys.add(key);
    }
  }

  return {
    debugMode: debugMode ?? false,
    profileUrl,
    getModifiedNestedElement,
    elements: mergedElements ?? Object.create(null),
    elementsByPath,
  };
}

function mergeElementsForContext(
  path: string,
  elements: Record<string, InternalSchemaElement>,
  parentContext: ElementsContextType
): ElementsContextType['elements'] {
  const result: ElementsContextType['elements'] = Object.create(null);
  for (const [key, element] of Object.entries(elements)) {
    const elementPath = path + '.' + key;
    if (parentContext.elementsByPath[elementPath]) {
      result[key] = parentContext.elementsByPath[elementPath];
      console.log(`REPLACED ${elementPath}`, parentContext.elementsByPath[elementPath], element);
    } else {
      result[key] = element;
    }
  }
  return result;
}