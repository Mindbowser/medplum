import { buildElementsContext } from './elements-context';
import { HTTP_HL7_ORG } from './constants';
import { isPopulated } from './utils';
import { parseStructureDefinition } from './typeschema/types';
import { StructureDefinition } from '@medplum/fhirtypes';
import { readJson } from '@medplum/definitions';

describe('buildElementsContext', () => {
  let USCoreStructureDefinitions: StructureDefinition[];
  beforeAll(() => {
    USCoreStructureDefinitions = readJson('fhir/r4/testing/uscore-v5.0.1-structuredefinitions.json');
  });

  test('deeply nested schema', () => {
    const profileUrl = `${HTTP_HL7_ORG}/fhir/us/core/StructureDefinition/us-core-medicationrequest`;
    const sd = USCoreStructureDefinitions.find((sd) => sd.url === profileUrl);
    if (!isPopulated(sd)) {
      fail(`Expected structure definition for ${profileUrl} to be found`);
    }
    const schema = parseStructureDefinition(sd);

    const context = buildElementsContext({
      elements: schema.elements,
      path: 'MedicationRequest',
      parentContext: undefined,
      profileUrl,
    });

    if (context === undefined) {
      fail('Expected context to be defined');
    }

    expect(context.profileUrl).toEqual(sd.url);
    expect(context.elements['dosageInstruction.method']).toBeDefined();
    expect(context.elementsByPath['MedicationRequest.dosageInstruction.method']).toBeDefined();
    expect(context.elements['dosageInstruction.method']).toBe(
      context.elementsByPath['MedicationRequest.dosageInstruction.method']
    );
  });
});
