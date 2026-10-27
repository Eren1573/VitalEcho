import React from 'react';

interface AvatarProps {
  className?: string;
  size?: number;
}

/**
 * Premium, friendly Male vector avatar directly inspired by reference illustrations (Image 2 & 3).
 * Features stylish dark hair, friendly expressive eyes, genuine smile, and clean colored shirt.
 */
export function MaleAvatar({ className = 'w-12 h-12', size }: AvatarProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="Male Avatar"
    >
      <defs>
        <clipPath id="maleCircleClip">
          <circle cx="60" cy="60" r="56" />
        </clipPath>
      </defs>

      {/* Circular Background Container */}
      <circle cx="60" cy="60" r="58" fill="#F0FDF4" stroke="#CBD5E1" strokeWidth="2.5" />

      <g clipPath="url(#maleCircleClip)">
        {/* Soft Background Fill */}
        <rect width="120" height="120" fill="#F1F5F9" />

        {/* Shoulders & Vibrant Green Shirt (as in Reference Image 3) */}
        <path
          d="M12 120 C12 94 34 85 60 85 C86 85 108 94 108 120 Z"
          fill="#10B981"
        />
        {/* Neckline Collar */}
        <path
          d="M49 85 C53 93 67 93 71 85"
          fill="#059669"
          opacity="0.3"
        />

        {/* Neck */}
        <path
          d="M51 68 L51 86 C51 90 69 90 69 86 L69 68 Z"
          fill="#F6B894"
        />
        {/* Neck shadow under chin */}
        <path
          d="M51 68 C56 73 64 73 69 68 L69 73 C64 78 56 78 51 73 Z"
          fill="#E59871"
          opacity="0.4"
        />

        {/* Head / Face */}
        <ellipse cx="60" cy="51" rx="22" ry="25" fill="#FCD5B5" />

        {/* Ears */}
        <circle cx="38" cy="52" r="5.5" fill="#F6B894" />
        <circle cx="82" cy="52" r="5.5" fill="#F6B894" />
        <circle cx="38.5" cy="52" r="3" fill="#E59871" opacity="0.5" />
        <circle cx="81.5" cy="52" r="3" fill="#E59871" opacity="0.5" />

        {/* Stylish Modern Dark Hair */}
        <path
          d="M37 45 C35 28 46 17 62 17 C78 17 85 27 84 43 C79 36 71 34 59 34 C47 34 41 39 37 45 Z"
          fill="#1E293B"
        />
        {/* Stylish Hair Quiff / Volume on Top (as in Image 3) */}
        <path
          d="M48 20 C54 13 65 14 68 18 C75 14 82 20 83 26 C80 23 75 22 71 23 C68 20 62 19 56 22 Z"
          fill="#0F172A"
        />
        {/* Sideburns */}
        <path
          d="M37 42 C36 46 37 50 39 52 L39 44 Z"
          fill="#1E293B"
        />
        <path
          d="M83 42 C84 46 83 50 81 52 L81 44 Z"
          fill="#1E293B"
        />

        {/* Eyebrows */}
        <path
          d="M46 41 C49 39 54 39 56 41"
          stroke="#0F172A"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M64 41 C66 39 71 39 74 41"
          stroke="#0F172A"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Friendly Expressive Eyes with Highlights */}
        <ellipse cx="51" cy="47" rx="3" ry="3.5" fill="#0F172A" />
        <ellipse cx="69" cy="47" rx="3" ry="3.5" fill="#0F172A" />
        <circle cx="52" cy="46" r="1.2" fill="#FFFFFF" />
        <circle cx="70" cy="46" r="1.2" fill="#FFFFFF" />

        {/* Gentle Nose */}
        <path
          d="M60 48 L58 55 L62 55"
          stroke="#D97706"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Warm Smiling Mouth with White Teeth (as in Image 3) */}
        <path
          d="M51 61 C51 68 69 68 69 61 Z"
          fill="#FFFFFF"
          stroke="#B91C1C"
          strokeWidth="1.2"
        />
        <path
          d="M50 61 C55 64 65 64 70 61"
          stroke="#991B1B"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Subtle Cheerful Cheeks */}
        <circle cx="45" cy="54" r="3.5" fill="#F87171" opacity="0.25" />
        <circle cx="75" cy="54" r="3.5" fill="#F87171" opacity="0.25" />
      </g>
    </svg>
  );
}

/**
 * Premium, friendly Female vector avatar directly inspired by reference illustrations (Image 2 & 3).
 * Features shoulder-length dark hair, expressive eyes, warm smile, and clean coral shirt.
 */
export function FemaleAvatar({ className = 'w-12 h-12', size }: AvatarProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="Female Avatar"
    >
      <defs>
        <clipPath id="femaleCircleClip">
          <circle cx="60" cy="60" r="56" />
        </clipPath>
      </defs>

      {/* Circular Background Container */}
      <circle cx="60" cy="60" r="58" fill="#FFF1F2" stroke="#CBD5E1" strokeWidth="2.5" />

      <g clipPath="url(#femaleCircleClip)">
        {/* Soft Background Fill */}
        <rect width="120" height="120" fill="#FDF2F8" />

        {/* Flowing Shoulder-Length Hair (Back Layer as in Image 3) */}
        <path
          d="M34 48 C24 64 25 88 32 98 C35 102 42 98 40 88 C38 74 36 60 38 48 Z"
          fill="#1E293B"
        />
        <path
          d="M86 48 C96 64 95 88 88 98 C85 102 78 98 80 88 C82 74 84 60 82 48 Z"
          fill="#1E293B"
        />

        {/* Shoulders & Vibrant Coral Top (as in Reference Image 3) */}
        <path
          d="M12 120 C12 94 34 85 60 85 C86 85 108 94 108 120 Z"
          fill="#EF4444"
        />
        {/* Neckline Shadow */}
        <path
          d="M48 85 C53 93 67 93 72 85"
          fill="#B91C1C"
          opacity="0.3"
        />

        {/* Neck */}
        <path
          d="M52 68 L52 86 C52 90 68 90 68 86 L68 68 Z"
          fill="#F6B894"
        />
        {/* Neck shadow under chin */}
        <path
          d="M52 68 C56 73 64 73 68 68 L68 73 C64 78 56 78 52 73 Z"
          fill="#E59871"
          opacity="0.4"
        />

        {/* Head / Face */}
        <ellipse cx="60" cy="51" rx="20.5" ry="24" fill="#FCD5B5" />

        {/* Ears */}
        <circle cx="39" cy="53" r="5" fill="#F6B894" />
        <circle cx="81" cy="53" r="5" fill="#F6B894" />

        {/* Shoulder-length Hair Framing Front */}
        <path
          d="M36 46 C33 28 44 18 60 18 C76 18 87 28 84 46 C80 34 70 30 60 30 C50 30 40 34 36 46 Z"
          fill="#1E293B"
        />
        {/* Soft Center-part Waves */}
        <path
          d="M41 31 C48 35 55 35 60 31 C65 35 72 35 79 31 C73 24 67 21 60 21 C53 21 47 24 41 31 Z"
          fill="#0F172A"
        />

        {/* Eyebrows */}
        <path
          d="M47 41 C50 39 54 39 56 41"
          stroke="#0F172A"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M64 41 C66 39 70 39 73 41"
          stroke="#0F172A"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Expressive Eyes with Catchlight Pupils */}
        <ellipse cx="51.5" cy="47" rx="3" ry="3.5" fill="#0F172A" />
        <ellipse cx="68.5" cy="47" rx="3" ry="3.5" fill="#0F172A" />
        <circle cx="52.5" cy="46" r="1.2" fill="#FFFFFF" />
        <circle cx="69.5" cy="46" r="1.2" fill="#FFFFFF" />

        {/* Delicate Eyelashes */}
        <path d="M48 45 L49.5 46" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M72 45 L70.5 46" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" />

        {/* Gentle Nose */}
        <path
          d="M60 48 L58.5 54 L61.5 54"
          stroke="#D97706"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Warm Smiling Mouth with White Teeth (as in Image 3) */}
        <path
          d="M52 61 C52 68 68 68 68 61 Z"
          fill="#FFFFFF"
          stroke="#BE123C"
          strokeWidth="1.2"
        />
        <path
          d="M51 61 C55 64 65 64 69 61"
          stroke="#E11D48"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Rosy Cheeks */}
        <circle cx="46" cy="54" r="3.5" fill="#FB7185" opacity="0.3" />
        <circle cx="74" cy="54" r="3.5" fill="#FB7185" opacity="0.3" />
      </g>
    </svg>
  );
}

export default function UserAvatar({
  gender,
  className = 'w-12 h-12',
  size
}: {
  gender?: string | null;
  className?: string;
  size?: number;
}) {
  const isMale = gender?.toLowerCase() === 'male';
  if (isMale) {
    return <MaleAvatar className={className} size={size} />;
  }
  return <FemaleAvatar className={className} size={size} />;
}
