'use client';
export default function PrintButton({id}:{id:string}){return <a className="shareprint" href={`/api/proposals/${id}/pdf`} download>Скачать PDF</a>}
