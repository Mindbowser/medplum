import { Attachment } from '@medplum/fhirtypes';
import { AttachmentDisplay } from '../AttachmentDisplay/AttachmentDisplay';

export interface AttachmentArrayDisplayProps {
  readonly values?: Attachment[];
  readonly maxWidth?: number;
}

export function AttachmentArrayDisplay(props: AttachmentArrayDisplayProps): JSX.Element {
  return (
    <div>
      {props.values?.map((v, index) => (
        <div key={'attatchment-' + index}>
          <AttachmentDisplay value={v} maxWidth={props.maxWidth} />
        </div>
      ))}
    </div>
  );
}
