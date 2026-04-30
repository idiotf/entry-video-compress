import Image from 'next/image'
import Link from 'next/link'
import uploadingToEntryImage from './uploading-to-entry.png'

function ExternalLink({ href, children }: React.PropsWithChildren<{
  href: string
}>) {
  return (
    <Link href={href} target='_blank' className='text-blue-500'>
      {children}
    </Link>
  )
}

function ErrorInfo({ id, title, children }: React.PropsWithChildren<{
  id: string
  title: string
}>) {
  return (
    <section>
      <hr className='my-8 border-gray-200 dark:border-gray-800' />
      <h2 id={id} className='text-black dark:text-white my-6 text-2xl min-[550px]:text-3xl font-medium target:text-orange-500'>
        <Link href={`#${id}`}>
          {title}
        </Link>
      </h2>
      {children}
    </section>
  )
}

export default function HelpPage() {
  return (
    <main className='max-w-5xl px-4 m-auto mb-8'>
      <h1 className='my-8 text-3xl min-[550px]:text-4xl font-semibold text-black dark:text-white'>
        도움말
      </h1>

      <ErrorInfo
        id='uploading-to-entry'
        title='엔트리에 업로드할 때'
      >
        <p className='mt-4 mb-2'>
          이 변환기는 엔트리에 업로드할 수 있는 .ent 파일을 내보냅니다.<br />
          이 때 <b>오프라인 작품 불러오기</b>를 사용해서 업로드해야 합니다.
        </p>
        <Image
          src={uploadingToEntryImage}
          alt='파일 모양 버튼을 누르고 &lsquo;오프라인 작품 불러오기&rsquo;를 눌러주세요.'
          loading='eager'
        />
      </ErrorInfo>

      <ErrorInfo
        id='reading-file'
        title='&lsquo;파일을 읽지 못했습니다.&rsquo; 오류'
      >
        <p className='mt-4 mb-2'>
          <b>파일 용량</b>이 너무 큰 경우, 변환 시 동영상 파일을 읽을 수 없습니다.<br />
          만약 동영상 파일의 용량을 줄이는 경우 아래를 참고해 주세요:
        </p>
        <ul className='list-disc pl-8'>
          <li>해상도를 <b>640×360</b> 이하로 줄여주세요.</li>
          <li>FPS를 <b>30FPS</b> 정도로 줄여주세요.</li>
          <li>가능한 경우 <b>영상의 길이</b>를 줄여주세요.</li>
        </ul>

        <p className='mt-2'>
          또한 이 변환기의 해상도/FPS 설정 기능을 사용하더라도 용량은 줄이지 못하므로,<br />
          <b>외부 프로그램</b>
          (예:
          <ExternalLink href='https://www.ffmpeg.org'>
            {' '}FFmpeg
          </ExternalLink>
          )으로 미리 용량을 줄인 뒤 변환해 주세요.
        </p>
      </ErrorInfo>

      <ErrorInfo
        id='extracting-frames'
        title='&lsquo;프레임을 추출하지 못했습니다.&rsquo; 오류'
      >
        <p className='mt-4 mb-2'>
          동영상 파일이 <b>지원되지 않는 코덱</b>(예: AV1)을 사용하는 경우 변환이 불가능합니다.<br />
          만약 비디오 코덱을 변경할 경우 아래 중 하나를 이용해 주세요:
        </p>
        <ul className='list-disc pl-8'>
          <li>H.264 (AVC)</li>
          <li>H.265 (HEVC)</li>
          <li>VP8 / VP9</li>
          <li>Theora</li>
          <li>
            이외
            <ExternalLink href='https://ffmpegwasm.netlify.app'>
              {' '}ffmpeg.wasm
            </ExternalLink>
            이 지원하는 비디오 코덱
          </li>
        </ul>
        <p className='mt-2'>
          또한 이 변환기의 해상도/FPS 설정 기능을 사용하더라도 용량은 줄이지 못하므로,<br />
          <b>외부 프로그램</b>
          (예:
          <Link href='https://www.ffmpeg.org' target='_blank' className='text-blue-500'>{' '}FFmpeg</Link>
          )으로 미리 용량을 줄인 뒤 변환해 주세요.
        </p>
      </ErrorInfo>

      <ErrorInfo
        id='unknown'
        title='&lsquo;변환에 실패했습니다.&rsquo; 오류'
      >
        <p className='mt-4 mb-2'>
          변환기의 예기치 못한 오류로 인해 발생하는 오류로, 주요 원인은 다음과 같습니다:
        </p>
        <ul className='list-disc pl-8'>
          <li>동영상 길이가 너무 긴 경우</li>
          <li>메모리 초과가 발생한 경우</li>
        </ul>
        <p className='mt-2'>
          만약 원인을 알 수 없는 버그가 발생한 경우,
          <ExternalLink href='https://github.com/idiotf/entry-video-compress/issues/new'>
            {' '}GitHub Issues
          </ExternalLink>
          에 해당 버그를 제보해 주세요.
        </p>
      </ErrorInfo>
    </main>
  )
}
