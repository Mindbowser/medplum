/* eslint-disable no-debugger */
import { Resource } from '@medplum/fhirtypes';
import {
  InternalSchemaElement,
  InternalTypeSchema,
  SliceDefinition,
  SliceDiscriminator,
  SlicingRules,
} from './typeschema/types';
import { arrayify, capitalize, deepClone, isObject, isPopulated } from './utils';
import { getNestedProperty } from './typeschema/crawler';
import { TypedValue } from './types';
import { matchDiscriminant } from './typeschema/validation';
import {
  ElementsContextType,
  SchemaCrawler,
  SchemaVisitor,
  VisitorSliceDefinition,
  VisitorSlicingRules,
} from './schema-crawler';

export function applyDefaultValues(
  resource: Resource,
  schema: InternalTypeSchema,
  options?: { debug?: boolean }
): Resource {
  const debugMode = Boolean(options?.debug);
  // const debugMsg: ConsoleDebug = debugMode ? console.debug : () => undefined;

  // const result = deepClone(resource);
  // const pathParts: string[] = [resource.resourceType];

  const visitor = new DefaultValueVisitor(resource);
  const crawler = new SchemaCrawler(schema, visitor);
  crawler.crawlSchema(debugMode);
  return visitor.getDefaultValue();
  /*
  debugMsg(`applyDefaultValues BEGIN\nvalue: ${JSON.stringify(result)}`);
  for (const [key, element] of Object.entries(schema.elements)) {
    pathParts.push(key);
    const path = resource.resourceType + '.' + key;

    let activeSchema: InternalTypeSchema;
    const typeProfileUrl = element.type.find((t) => isPopulated(t.profile))?.profile?.[0];
    if (typeProfileUrl) {
      activeSchema = tryGetProfile(typeProfileUrl);
      // change active schema
    } else {
      activeSchema = schema;
    }

    console.log(activeSchema.name, path);

    if (isPopulated(element.slicing)) {
      element.slicing.slices;
    }

    // if (element.fixed || element.pattern) {
    //   debugMsg(
    //     `applyDefaultValues key: ${key} ${element.fixed ? 'fixed' : 'pattern'}: ${JSON.stringify((element.fixed ?? element.pattern)?.value)}`
    //   );
    //   debugMsg('applyDefaultValues top', JSON.stringify(result, undefined, 2));
    // } else {
    //   continue;
    // }

    pathParts.pop();
  }

  // const result = modifyDefaultValueImpl({ type: parentType, value: defaultValue }, mergedElements, Boolean(debugMode));
  // return result;

  return resource;*/
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, prefer-const
let foo = 0;

type SliceValue = any;
type SlicingContext = {
  path: string;
  slicing: SlicingRules;
  valuesBySliceName: Record<string, SliceValue>;
};

type SliceContext = {
  slice: VisitorSliceDefinition;
  // values: TypedValue[][];
};

type ValueContext = {
  path: string;
  values: TypedValue[];
};

// type NestedPropertyReturnVal = (TypedValue | TypedValue[] | undefined)[];

class DefaultValueVisitor implements SchemaVisitor {
  private readonly inputResource: Resource;
  private readonly outputResource: Resource;

  private readonly schemaStack: InternalTypeSchema[];
  private valueStack: ValueContext[];
  private readonly slicingContextStack: SlicingContext[];
  private readonly sliceContextStack: SliceContext[];

  private debugMode: boolean = true;

  constructor(resource: Resource) {
    this.inputResource = resource;
    this.outputResource = deepClone(this.inputResource);

    this.schemaStack = [];
    this.valueStack = [];
    this.slicingContextStack = [];
    this.sliceContextStack = [];
  }

  private get schema(): InternalTypeSchema {
    return this.schemaStack[this.schemaStack.length - 1];
  }

  private get slicingContext(): SlicingContext {
    return this.slicingContextStack[this.slicingContextStack.length - 1];
  }

  private get sliceContext(): SliceContext {
    return this.sliceContextStack[this.sliceContextStack.length - 1];
  }

  private get value(): ValueContext {
    return this.valueStack[this.valueStack.length - 1];
  }

  private debug(...data: any[]): void {
    if (this.debugMode) {
      console.debug(`[ApplyDefaults][${this.schema.name}]`, ...data);
    }
  }

  private getValueAtPath(
    path: string,
    value: TypedValue,
    valuePath: string,
    profileUrl: string | undefined
  ): (TypedValue | TypedValue[] | undefined)[] {
    let pathDiff: string;
    if (path.startsWith(valuePath)) {
      pathDiff = path.slice(valuePath.length + 1);
    } else {
      debugger;
      return [];
    }

    return getNestedProperty(value, pathDiff, { profileUrl, includeEmptyValues: false });
  }

  /*
  private getValuesAtPath(
    path: string,
    profileUrl: string | undefined
  ): (NestedPropertyReturnVal | NestedPropertyReturnVal[])[] {
    const [_resourceType, _restOfPath] = splitN(path, '.', 2);
    const valueContext = this.value;
    let pathDiff: string;
    if (path.startsWith(valueContext.path)) {
      pathDiff = path.slice(valueContext.path.length + 1);
    } else {
      return [];
    }
    return valueContext.value.map((v) => {
      if (Array.isArray(v)) {
        return v.map((innerV) => getNestedProperty(innerV, pathDiff, { profileUrl }));
      } else {
        return getNestedProperty(v, pathDiff, {
          profileUrl,
        });
      }
    });
    // return getNestedProperty({ type: this.inputResource.resourceType, value: this.inputResource }, restOfPath, {
    // profileUrl,
    // });
  }*/

  onEnterResource(schema: InternalTypeSchema): void {
    this.valueStack.push({
      path: this.inputResource.resourceType,
      values: [{ type: schema.name, value: this.outputResource }],
    });
    this.schemaStack.push(schema);
  }

  onExitResource(): void {
    const valueContext = this.valueStack.pop();
    if (!valueContext) {
      throw new Error('Expected valueContext to exist when exiting resource');
    }
    this.debug('onExitResource', JSON.stringify(valueContext.values));
    console.assert(this.valueStack.length === 0, 'Expected valueStack to be empty when exiting resource');

    this.schemaStack.pop();
    console.assert(this.schemaStack.length === 0, 'Expected schema stack to be empty when exiting resource');
  }

  onEnterElement(path: string, element: InternalSchemaElement, elementsContext: ElementsContextType): void {
    const parentPath = this.value.path;
    const parentValues = this.value.values;
    const key = path.slice(parentPath.length + 1);
    this.debug('onEnterElement', path);

    if (path === 'Observation.category') {
      debugger;
    }
    if (path === 'Observation.category.coding.code') {
      debugger;
    }
    const currentValues: TypedValue[] = [];
    for (const parentValue of parentValues) {
      let elementValues;
      if (Array.isArray(parentValue.value)) {
        const parentType = parentValue.type;
        applyMinimum(parentValue, key, element, elementsContext.elements, true);
        const newParentValue = applyFixedOrPatternValue(parentValue, key, element, elementsContext.elements, true);
        const newParentTypedValue = { type: parentType, value: newParentValue };
        elementValues = (newParentTypedValue.value as any[])
          .map((innerParentValue) => {
            return this.getValueAtPath(
              path,
              { type: parentType, value: innerParentValue },
              parentPath,
              this.schema?.url
            );
          })
          .flat();
      } else {
        const parentType = parentValue.type;
        applyMinimum(parentValue, key, element, elementsContext.elements, true);
        const newParentValue = applyFixedOrPatternValue(parentValue, key, element, elementsContext.elements, true);
        const newParentTypedValue = { type: parentType, value: newParentValue };
        // const existingValue = this.getValueAtPath(path, parentValue, parentPath, this.schema?.url);
        if (path === 'Observation.category') {
          debugger;
        }
        elementValues = this.getValueAtPath(path, newParentTypedValue, parentPath, this.schema?.url);
        /*
        if (element.isArray && element.min > 0 && elementValues.length === 0) {
          const emptyArray: any[] = [];
          (emptyArray as any).__w = `onEnterElement[${key}] min > 0`;
          parentValue.push(emptyArray);
          sliceValues.push(emptyArray);
        }*/
      }

      for (const elementValue of elementValues) {
        // this.valueStack.push({ path, type: element.type });
        // this.valueStack.push(elementValue);

        let typedValue: TypedValue;
        if (elementValue === undefined) {
          typedValue = { type: 'undefined', value: undefined };
        } else if (Array.isArray(elementValue)) {
          if (elementValue.length === 0) {
            debugger;
          }
          typedValue = {
            type: element.type[0].code, //elementValue[0].type,
            value: elementValue.map((e) => e.value),
          };
        } else {
          typedValue = elementValue;
        }
        // if ((element.fixed || element.pattern) && element.min > 0) {
        // this.debug(`has min: ${element.min}`, typedValue);
        // if (typedValue.type === 'undefined') {
        // typedValue = {
        // type: element.type[0].code,
        // value: deepClone(element.fixed ?? element.pattern), //TODO clone these?
        // };
        // }
        // }

        currentValues.push(typedValue);

        if (typedValue.value !== undefined) {
          this.debug('elementValue', JSON.stringify(typedValue));
        }

        /*
        if (element.fixed || element.pattern) {
          const fixedOrPattern = element.fixed ? 'fixed' : 'pattern';
          // const existingValue = this.getValuesAtPath(path, this.schema.url);
          this.debug(`has ${fixedOrPattern}\n${JSON.stringify((element.fixed ?? element.pattern)?.value)}`);
          // debug('modifyDV top', JSON.stringify(outputValue, undefined, 2));
        } else {
          // this.debug(`skipping ${path}`);
        }*/
      }
    }

    this.valueStack.push({
      path: path,
      values: currentValues,
    });
  }

  onExitElement(): void {
    const elementValueContext = this.valueStack.pop();
    if (!elementValueContext) {
      throw new Error('Expected value context to exist when exiting element');
    }

    if (elementValueContext?.values.some((v) => isPopulated(v.value))) {
      this.debug('onExitElement', elementValueContext.path);
      for (let i = 0; i < this.value.values.length; i++) {
        const elementTV = elementValueContext.values[i];
        if (isPopulated(elementTV.value)) {
          const parentTV = this.value.values[i];
          const parentType = parentTV.type;
          const parentValue = parentTV.value;
          this.debug(
            `zipping\nparentType: ${parentType}\nparentValue:\n${JSON.stringify(parentValue)}\nelementType: ${elementTV.type}\nelementValue:\n${JSON.stringify(elementTV.value)}`
          );
        }
        /*
        if (parentValue === undefined) {
          this.value.values[i] = elementValue;
        } else {
          if (!Array.isArray(this.value.values[i].value)) {
            throw new Error('Sliced element should have an array value');
          }
          this.value.values[i].value.push(...elementValue.value);
        }*/
      }
    }
  }

  onEnterSlicing(path: string, slicing: VisitorSlicingRules): void {
    const valuesBySliceName: Record<string, SliceValue> = {};
    for (const slice of slicing.slices) {
      valuesBySliceName[slice.name] = [];
    }
    // const existingValue = this.getValueAtPath(path);
    // if (Array.isArray(existingValue)) {
    // valuesBySliceName = assignValuesIntoSlices(existingValue, slicing.slices, slicing, this.schema);
    // } else {
    // valuesBySliceName = {};
    // }

    this.slicingContextStack.push({ path, slicing, valuesBySliceName });
    // this.debug(`onEnterSlicing values:\n${JSON.stringify(valuesBySliceName, undefined, 2)}`);
  }

  onExitSlicing(): void {
    const context = this.slicingContextStack.pop();
    if (!context) {
      throw new Error('Expected slicing context to exist');
    }
  }

  onEnterSlice(path: string, slice: VisitorSliceDefinition): void {
    this.debug('onEnterSlice', path, slice.name);
    const parentValues = this.value.values;
    const currentValues: TypedValue[] = [];
    for (const parentTypedValue of parentValues) {
      let parentType = parentTypedValue.type;
      let parentValue = parentTypedValue.value;

      const sliceValues: any[] = [];
      if (parentTypedValue.value === undefined) {
        if (slice.min > 0) {
          parentType = slice.typeSchema?.name ?? slice.type[0].code;
          debugger;
          parentValue = [];
        }
      }

      this.debug('find slice values...', parentValue);
      if (!Array.isArray(parentValue)) {
        throw new Error('Expect array of values in slice');
      }
      for (const arrayValue of parentValue) {
        const sliceName = getValueSliceName(
          arrayValue,
          [slice],
          this.slicingContext.slicing.discriminator,
          slice.typeSchema,
          this.schema.url
        );
        if (sliceName === slice.name) {
          this.debug('sliceName', sliceName, arrayValue);
          sliceValues.push(arrayValue);
        }
      }
      if (slice.min > 0 && sliceValues.length === 0) {
        // TODO - is it possible that emptySlice should be something besides an object, e.g. a string for a simple type
        const emptySliceValue = Object.create(null);
        emptySliceValue.__w = `onEnterSlice[${slice.name}] min > 0`;
        parentValue.push(emptySliceValue);
        sliceValues.push(emptySliceValue);
      }
      currentValues.push({ type: parentType, value: sliceValues });
    }
    this.valueStack.push({
      path,
      values: currentValues,
    });
    this.sliceContextStack.push({ slice });
    // this.valueStack.push({ path: path, value: sliceValuesByValue });

    if (slice.typeSchema) {
      debugger;
      this.schemaStack.push(slice.typeSchema);
    }
  }

  onExitSlice(): void {
    const sliceValueContext = this.valueStack.pop();
    if (!sliceValueContext) {
      throw new Error('Expected value context to exist in onExitSlice');
    }

    const sliceCtx = this.sliceContextStack.pop();
    if (!sliceCtx) {
      throw new Error('Expected slice context to exist on exit');
    }

    if (sliceCtx.slice.typeSchema) {
      this.schemaStack.pop();
    }

    this.debug('onExitSlice', sliceCtx.slice.name, JSON.stringify(sliceValueContext.values));
    debugger;
    this.debug('parentValue', JSON.stringify(this.value.values));
    for (let i = 0; i < this.value.values.length; i++) {
      const elementTypedValue = this.value.values[i];
      const elementType = elementTypedValue.type;
      const elementValue = elementTypedValue.value;
      const sliceValues = sliceValueContext.values[i];
      this.debug(
        `zipping\nelementType:\n${elementType}\nelementValue:\n${JSON.stringify(this.value.values[i].value)}\nsliceValues:\n${JSON.stringify(sliceValues)}`
      );
      if (elementValue === undefined) {
        this.value.values[i] = sliceValues;
      } else {
        if (!Array.isArray(this.value.values[i].value)) {
          throw new Error('Sliced element should have an array value');
        }
        this.value.values[i].value.push(...sliceValues.value);
      }
      this.debug(`result:\n${JSON.stringify(this.value.values[i].value)}`);
    }
  }

  getDefaultValue(): Resource {
    return this.inputResource;
  }
}

function isDiscriminatorComponentMatch(
  typedValue: TypedValue,
  discriminator: SliceDiscriminator,
  slice: SliceDefinition,
  sliceSchema: InternalTypeSchema | undefined,
  profileUrl: string | undefined
): boolean {
  const nestedProp = getNestedProperty(typedValue, discriminator.path, { profileUrl: sliceSchema?.url ?? profileUrl });

  if (nestedProp) {
    const elementList = sliceSchema?.elements ?? slice.elements;
    return arrayify(nestedProp)?.some((v: any) => matchDiscriminant(v, discriminator, slice, elementList)) ?? false;
  } else {
    console.assert(false, 'getNestedProperty[%s] in isDiscriminatorComponentMatch missed', discriminator.path);
  }

  return false;
}

function getValueSliceName(
  value: any,
  slices: SliceDefinition[],
  discriminators: SliceDiscriminator[],
  sliceSchema: InternalTypeSchema | undefined,
  profileUrl: string | undefined
): string | undefined {
  if (!value) {
    return undefined;
  }

  for (const slice of slices) {
    const sliceType = sliceSchema?.name ?? slice.type?.[0].code ?? 'TODO';
    const typedValue: TypedValue = {
      value,
      type: sliceType,
    };
    if (discriminators.every((d) => isDiscriminatorComponentMatch(typedValue, d, slice, sliceSchema, profileUrl))) {
      return slice.name;
    }
  }
  return undefined;
}

// export function applyDefaultValuesAtPath<T>(value: T, path: string, profileUrl: string, debug?: boolean): T {
// return value;
// }

function applyMinimum(
  input: TypedValue,
  key: string,
  element: InternalSchemaElement,
  elements: Record<string, InternalSchemaElement>,
  debugMode: boolean
): any {
  const inputType = input.type;
  const inputValue = input.value;
  const outputValue = inputValue;

  if (inputValue === undefined || inputValue === null) {
    throw new Error('inputValue cannot be undefined or null');
  }

  if (Array.isArray(inputValue)) {
    return inputValue.map((iv) =>
      applyFixedOrPatternValue({ type: inputType, value: iv }, key, element, elements, debugMode)
    );
  }

  inputValue satisfies object;

  const debug: ConsoleDebug = debugMode ? console.debug : () => undefined;

  if (element.min > 0) {
    const elementType = element.type[0].code;
    if (elementType.startsWith(elementType[0].toUpperCase())) {
      const keyParts = key.split('.');
      let last: any = outputValue;
      for (let i = 0; i < keyParts.length; i++) {
        let keyPart = keyParts[i];
        if (keyPart.includes('[x]')) {
          const keyPartElem = elements[keyParts.slice(0, i + 1).join('.')];
          const code = keyPartElem.type[0].code;
          keyPart = keyPart.replace('[x]', capitalize(code));
        }

        if (i === keyParts.length - 1) {
          const lastArray = Array.isArray(last) ? last : [last];
          for (const item of lastArray) {
            if (element.isArray) {
              // item[keyPart] = [Object.create(null)];
              item[keyPart] = [];
            } else {
              item[keyPart] = Object.create(null);
            }
          }
        } else {
          if (!(keyPart in last)) {
            const elementKey = keyParts.slice(0, i + 1).join('.');
            debug(`creating empty value for ${elementKey}`);
            last[keyPart] = elements[elementKey].isArray ? [Object.create(null)] : Object.create(null);
          }
          debug('setting last to', JSON.stringify(last[keyPart], undefined, 2));
          last = last[keyPart];
        }
      }
    }
  }
  return outputValue;
}

function applyFixedOrPatternValue(
  input: TypedValue,
  key: string,
  element: InternalSchemaElement,
  elements: Record<string, InternalSchemaElement>,
  debugMode: boolean
): any {
  const inputType = input.type;
  const inputValue = input.value;

  if (inputValue === undefined || inputValue === null) {
    throw new Error('inputValue cannot be undefined or null');
  }

  if (Array.isArray(inputValue)) {
    return inputValue.map((iv) =>
      applyFixedOrPatternValue({ type: inputType, value: iv }, key, element, elements, debugMode)
    );
  }

  // const outputValue = inputValue === undefined ? undefined : deepClone(inputValue);
  const outputValue = inputValue; // === undefined ? undefined : deepClone(inputValue);

  inputValue satisfies object;

  const debug: ConsoleDebug = debugMode ? console.debug : () => undefined;

  if (element.fixed || element.pattern) {
    debug(
      `applyFixedPattern key: ${key} ${element.fixed ? 'fixed' : 'pattern'}: ${JSON.stringify((element.fixed ?? element.pattern)?.value)}`
    );
    debug(`begin`, JSON.stringify(inputValue, undefined, 2));

    const keyParts = key.split('.');
    let last: any = outputValue;
    for (let i = 0; i < keyParts.length; i++) {
      let keyPart = keyParts[i];
      if (keyPart.includes('[x]')) {
        const keyPartElem = elements[keyParts.slice(0, i + 1).join('.')];
        const code = keyPartElem.type[0].code;
        keyPart = keyPart.replace('[x]', capitalize(code));
      }

      if (i === keyParts.length - 1) {
        const lastArray = Array.isArray(last) ? last : [last];
        for (const item of lastArray) {
          if (element.fixed) {
            debugger;
            item[keyPart] = applyFixed(item[keyPart], element.fixed.value, debug);
          } else if (element.pattern) {
            item[keyPart] = applyPattern(item[keyPart], element.pattern.value, debug);
          }
        }
      } else {
        if (!(keyPart in last)) {
          const elementKey = keyParts.slice(0, i + 1).join('.');
          debug(`creating empty value for ${elementKey}`);
          last[keyPart] = elements[elementKey].isArray ? [Object.create(null)] : Object.create(null);
        }
        debug('setting last to', JSON.stringify(last[keyPart]));
        last = last[keyPart];
      }
    }
    debug(`done`, JSON.stringify(outputValue, undefined, 2));
  }

  return outputValue;
}

/*
function modifyDefaultValueImpl(
  defaultValue: TypedValue,
  elements: ElementsContextType['elements'],
  debugMode: boolean
): any {
  const inputType = defaultValue.type;
  const inputValue: any = defaultValue.value;

  if (Array.isArray(inputValue)) {
    return inputValue.map((iv) => modifyDefaultValueImpl({ type: inputType, value: iv }, elements, debugMode));
  }

  const debug: ConsoleDebug = debugMode ? console.debug : () => undefined;

  const outputValue: any = deepClone(inputValue);
  debug(`modifyDV  INPUT\ntype: ${inputType}\nvalue: ${JSON.stringify(outputValue)}`);

  for (const [key, element] of Object.entries(elements)) {
    if (element.fixed || element.pattern) {
      debug(
        `modifyDV key: ${key} ${element.fixed ? 'fixed' : 'pattern'}: ${JSON.stringify((element.fixed ?? element.pattern)?.value)}`
      );
      debug('modifyDV top', JSON.stringify(outputValue, undefined, 2));
    } else {
      continue;
    }

    const keyParts = key.split('.');
    let last: any = outputValue;
    for (let i = 0; i < keyParts.length; i++) {
      let keyPart = keyParts[i];
      if (keyPart.includes('[x]')) {
        const keyPartElem = elements[keyParts.slice(0, i + 1).join('.')];
        const code = keyPartElem.type[0].code;
        keyPart = keyPart.replace('[x]', capitalize(code));
      }

      if (i === keyParts.length - 1) {
        const lastArray = Array.isArray(last) ? last : [last];
        for (const item of lastArray) {
          if (element.fixed) {
            item[keyPart] = applyFixed(item[keyPart], element.fixed.value, debug);
          } else if (element.pattern) {
            item[keyPart] = applyPattern(item[keyPart], element.pattern.value, debug);
          }
        }
      } else {
        if (!(keyPart in last)) {
          const elementKey = keyParts.slice(0, i + 1).join('.');
          debug(`creating empty value for ${elementKey}`);
          last[keyPart] = elements[elementKey].isArray ? [Object.create(null)] : Object.create(null);
        }
        debug('setting last to', JSON.stringify(last[keyPart], undefined, 2));
        last = last[keyPart];
      }
    }
    debug('modifyDV bottom', JSON.stringify(outputValue, undefined, 2));
  }

  debug('modifyDV OUTPUT', JSON.stringify(outputValue));
  return outputValue;
}
*/

function applyFixed(value: any, fixed: any, debug: ConsoleDebug): any {
  if (value === undefined) {
    debug('applyFixed', fixed);
    return fixed;
  }
  return value;
}

function applyPattern(existingValue: any, pattern: any, debug: ConsoleDebug): any {
  try {
    const result = existingValue === undefined ? undefined : deepClone(existingValue);

    if (Array.isArray(pattern)) {
      if (Array.isArray(existingValue) || existingValue === undefined || existingValue === null) {
        if ((existingValue?.length ?? 0) > 0) {
          throw new Error(
            'Cannot yet apply a pattern to a non-empty array since that would require considering cardinality and slicing'
          );
        } else {
          return [pattern];
        }
      } else {
        throw new Error('Type of value incompatible with array pattern');
      }
    } else if (isObject(pattern)) {
      if (isObject(existingValue) || existingValue === undefined || existingValue === null) {
        const resultObj = (result ?? Object.create(null)) as { [key: string]: any };
        for (const key of Object.keys(pattern)) {
          const output = applyPattern(resultObj[key], pattern[key], debug);
          debug(
            `object set ${key}`,
            JSON.stringify({ existing: resultObj[key] ?? null, pattern: pattern[key], output }, undefined, 2)
          );
          resultObj[key] = applyPattern(resultObj[key], pattern[key], debug);
        }
        return resultObj;
      } else {
        throw new Error('Type of value incompatible with object pattern');
      }
    }

    throw new Error('Unexpected type of pattern');
  } catch (ex) {
    return existingValue;
  }
}

// export type ElementsContextType = {
// debugMode: boolean;
// profileUrl: string | undefined;
// /**
//  * Get the element definition for the specified path if it has been modified by a profile.
//  * @param nestedElementPath - The path of the nested element
//  * @returns The modified element definition if it has been modified by the active profile or undefined. If undefined,
//  * the element has the default definition for the given type.
//  */
// getModifiedNestedElement: (nestedElementPath: string) => InternalSchemaElement | undefined;
// getElementByPath: (path: string) => InternalSchemaElement | undefined;
// elements: Record<string, InternalSchemaElement>;
// elementsByPath: Record<string, InternalSchemaElement>;
// modifyDefaultValue: <T extends object>(defaultValue: T, debugMode?: boolean) => T;
// };
//
// export type BuildElementsContextArgs = {
// elements: InternalTypeSchema['elements'] | undefined;
// parentPath: string;
// parentContext: ElementsContextType | undefined;
// parentType: string;
// profileUrl?: string;
// debugMode?: boolean;
// };

/*
export function buildElementsContext({
  parentContext,
  elements,
  parentPath,
  parentType,
  profileUrl,
  debugMode,
}: BuildElementsContextArgs): ElementsContextType {
  if (debugMode) {
    console.debug('Building ElementsContext', { parentPath, profileUrl, elements });
  }
  const mergedElements: ElementsContextType['elements'] = mergeElementsForContext(
    parentPath,
    elements,
    parentContext,
    Boolean(debugMode)
  );

  const nestedPaths: Record<string, InternalSchemaElement> = Object.create(null);
  const elementsByPath: ElementsContextType['elementsByPath'] = Object.create(null);

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

  function getElementByPath(path: string): InternalSchemaElement | undefined {
    return elementsByPath[path];
  }

  function getModifiedNestedElement(nestedElementPath: string): InternalSchemaElement | undefined {
    return nestedPaths[nestedElementPath];
  }

  function modifyDefaultValue<T extends object>(defaultValue: T, debugMode?: boolean): T {
    const result = modifyDefaultValueImpl(
      { type: parentType, value: defaultValue },
      mergedElements,
      Boolean(debugMode)
    );
    return result;
  }

  return {
    debugMode: debugMode ?? parentContext?.debugMode ?? false,
    profileUrl: profileUrl ?? parentContext?.profileUrl,
    getModifiedNestedElement,
    getElementByPath,
    elements: mergedElements,
    elementsByPath,
    modifyDefaultValue,
  };
}

function mergeElementsForContext(
  parentPath: string,
  elements: BuildElementsContextArgs['elements'],
  parentContext: BuildElementsContextArgs['parentContext'],
  debugMode: boolean
): ElementsContextType['elements'] {
  const result: ElementsContextType['elements'] = Object.create(null);

  if (parentContext) {
    const parentPathPrefix = parentPath + '.';
    for (const [path, element] of Object.entries(parentContext.elementsByPath)) {
      if (path.startsWith(parentPathPrefix)) {
        const key = path.slice(parentPathPrefix.length);
        result[key] = element;
      }
    }
  }

  let usedNewElements = false;
  if (elements) {
    for (const [key, element] of Object.entries(elements)) {
      if (!(key in result)) {
        result[key] = element;
        usedNewElements = true;
      }
    }
  }

  // TODO if no new elements are used, the elementscontext is very likely not necessary;
  // there could be an optimization where buildElementsContext returns undefined in this case
  // to avoid needless contexts
  if (debugMode && parentContext && !usedNewElements) {
    console.debug('ElementsContext elements same as parent context');
  }
  return result;
}


*/
type ConsoleDebug = typeof console.debug;

export function assignValuesIntoSlices(
  values: any[],
  slices: SliceDefinition[],
  slicing: SlicingRules,
  sliceSchema: InternalTypeSchema | undefined,
  profileUrl: string | undefined
): any[][] {
  if (!slicing || slicing.slices.length === 0) {
    return [values];
  }

  // store values in an array of arrays: one for each slice plus another for non-sliced values
  const slicedValues: any[][] = new Array(slices.length + 1);
  for (let i = 0; i < slicedValues.length; i++) {
    slicedValues[i] = [];
  }

  for (const value of values) {
    const sliceName = getValueSliceName(value, slices, slicing.discriminator, sliceSchema, profileUrl);

    // values not matched to a slice go in the last entry for non-slice
    const sliceIndex = sliceName ? slices.findIndex((slice) => slice.name === sliceName) : slices.length;
    slicedValues[sliceIndex].push(value);
  }

  // add placeholder empty values
  for (let sliceIndex = 0; sliceIndex < slices.length; sliceIndex++) {
    const slice = slices[sliceIndex];
    const sliceValues = slicedValues[sliceIndex];

    if (sliceValues.length < slice.min) {
      while (sliceValues.length < slice.min) {
        sliceValues.push(undefined);
      }
    } else if (sliceValues.length === 0) {
      sliceValues.push(undefined);
    }
  }

  return slicedValues;
}
