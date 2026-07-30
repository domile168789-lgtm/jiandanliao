import React from 'react';

type DataModeNoticeProps = {
  message: string;
};

export default function DataModeNotice({ message }: DataModeNoticeProps) {
  return <div className="data-mode-notice is-demo">{message}</div>;
}
