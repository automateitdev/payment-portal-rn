import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, { Path, Rect, Circle, Line, Polyline } from "react-native-svg";

export interface IconProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
}

/**
 * 📥 Download Icon — Premium refined downward arrow into a curved dock
 */
export const DownloadIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 3.5V15M12 15L7.5 10.5M12 15L16.5 10.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M4 14.5V17C4 18.6569 5.34315 20 7 20H17C18.6569 20 20 18.6569 20 17V14.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 💾 Save Icon — Premium sleek diskette with precision cutouts
 */
export const SaveIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M17 21V13H7V21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M7 3V7.5H14"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ✏️ Edit / Pencil Icon — Modern angled stylus with document underline
 */
export const EditIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ✏️ Minimal Angled Pen / Pencil Icon (Matching Reference)
 */
export const PenIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M17.85 3.15a2.5 2.5 0 0 1 3.54 3.54L7.5 20.6a1 1 0 0 1-.45.26l-3.65 1a.5.5 0 0 1-.61-.61l1-3.65a1 1 0 0 1 .26-.45L17.85 3.15z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🔄 Update / Sync Icon — Precision dual circular refresh arrows
 */
export const UpdateIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M21.5 2.5V8H16"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M2.5 21.5V16H8"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M20.49 15A9 9 0 0 1 5.64 18.36L2.5 16M3.51 9A9 9 0 0 1 18.36 5.64L21.5 8"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🗑️ Delete / Trash Icon — Sleek tapered trash can with floating lid & interior ribs
 */
export const DeleteIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M3 6H21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M19 6V19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M10 11V16"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M14 11V16"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 📄 PDF / Document Icon — Crisp document with folded corner and badge
 */
export const PdfIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M14 2V8H20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M8 14H16M8 18H13"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 📊 Excel / Sheet Icon — Spreadsheet grid
 */
export const ExcelIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M14 2V8H20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M8 13H16M8 17H16M12 10V20"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 👁️ View / Eye Icon — Human eye contour
 */
export const EyeIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Circle
            cx="12"
            cy="12"
            r="3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ➕ Plus / Add Icon — Precision centered cross
 */
export const PlusIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 5V19M5 12H19"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ⊕ Plus Circle Icon — Plus inside a ring
 */
export const PlusCircleIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
        <Path
            d="M12 8V16M8 12H16"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ⊖ Minus Circle Icon — Minus inside a ring
 */
export const MinusCircleIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
        <Path
            d="M8 12H16"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🖨️ Print Icon — Modern printer
 */
export const PrintIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M6 9V2H18V9"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M6 18H4C2.89543 18 2 17.1046 2 16V11C2 9.89543 2.89543 9 4 9H20C21.1046 9 22 9.89543 22 11V16C22 17.1046 21.1046 18 20 18H18"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Rect
            x="6"
            y="14"
            width="12"
            height="8"
            rx="1"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🔍 Search Icon — Sleek magnifying glass
 */
export const SearchIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="11"
            cy="11"
            r="7"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M20 20L16 16"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🔽 Chevron Down Circle Icon — Expand All action
 */
export const ChevronDownCircleIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="12"
            cy="12"
            r="9"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M8.5 10.5L12 14L15.5 10.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🔼 Chevron Up Circle Icon — Collapse All action
 */
export const ChevronUpCircleIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="12"
            cy="12"
            r="9"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M15.5 13.5L12 10L8.5 13.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🔽 Chevron Down Icon — Modern minimal arrow
 */
export const ChevronDownIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M6 9L12 15L18 9"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🔼 Chevron Up Icon — Modern minimal arrow
 */
export const ChevronUpIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M18 15L12 9L6 15"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ◀️ Chevron Left Icon — Modern minimal arrow
 */
export const ChevronLeftIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M15 18L9 12L15 6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ▶️ Chevron Right Icon — Modern minimal arrow
 */
export const ChevronRightIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M9 18L15 12L9 6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ⚠️ Warning / Alert Icon — Modern caution triangle
 */
export const WarningIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 9V14"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M12 17.5V17.6"
            stroke={color}
            strokeWidth={strokeWidth + 0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M10.29 3.86L1.82 18C1.64 18.3 1.55 18.65 1.55 19C1.55 20.1 2.45 21 3.55 21H20.45C21.55 21 22.45 20.1 22.45 19C22.45 18.65 22.36 18.3 22.18 18L13.71 3.86C13.35 3.24 12.7 2.87 12 2.87C11.3 2.87 10.65 3.24 10.29 3.86Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ✔️ Check / Checkmark Icon
 */
export const CheckIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M20 6L9 17L4 12"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ✖️ Close / X Icon
 */
export const CloseIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M18 6L6 18M6 6L18 18"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ✖️ Close Circle Icon
 */
export const CloseCircleIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="12"
            cy="12"
            r="10"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M15 9L9 15M9 9L15 15"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🚫 Ban / "not allowed" Icon
 */
export const BanIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="12"
            cy="12"
            r="10"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M5 5L19 19"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 👥 Users / Group Icon
 */
export const UsersIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="9"
            cy="7"
            r="4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M16 3.13C17.7699 3.58317 19.0078 5.17799 19.0078 7.005C19.0078 8.83201 17.7699 10.4268 16 10.88"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M23 21V19C22.9986 17.1771 21.765 15.5857 20 15.13"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🕒 Clock / Time Icon
 */
export const ClockIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="12"
            cy="12"
            r="10"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M12 6V12L16 14"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 📅 Calendar Icon
 */
export const CalendarIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M16 2V6M8 2V6M3 10H21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ☁️ Upload Icon
 */
export const UploadIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 12V21M12 12L8.5 15.5M12 12L15.5 15.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ✈️ Paper Plane / Send Icon
 */
export const PaperPlaneIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 👤 User / Person Icon
 */
export const UserIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="12"
            cy="7"
            r="4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 📄 Document Icon
 */
export const DocumentIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M14 2V8H20M16 13H8M16 17H8M10 9H8"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 👤➕ User Add / Person Add Icon
 */
export const UserAddIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M16 21V19C16 16.7909 14.2091 15 12 15H5C2.79086 15 1 16.7909 1 19V21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Circle
            cx="8.5"
            cy="7"
            r="4"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M20 8V14M17 11H23"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🔒 Lock / Padlock Icon
 */
export const LockIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="3"
            y="11"
            width="18"
            height="11"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Circle cx="12" cy="16" r="1.5" fill={color} />
    </Svg>
);

/**
 * 🔓 Unlock / Open Padlock Icon
 */
export const UnlockIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="3"
            y="11"
            width="18"
            height="11"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M7 11V7C7 4.23858 9.23858 2 12 2C13.9 2 15.5 3.1 16.4 4.7"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Circle cx="12" cy="16" r="1.5" fill={color} />
    </Svg>
);

/**
 * ⚙️ Settings / Cog Icon
 */
export const SettingsIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="12"
            cy="12"
            r="3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🛡️ Shield Check Icon
 */
export const ShieldCheckIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 22S20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M9 12L11 14L15 10"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🔲 Shortcut / Grid Icon — Modern 4-tile launcher grid with soft rounded corners
 */
export const ShortcutIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="3.5"
            y="3.5"
            width="7"
            height="7"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Rect
            x="13.5"
            y="3.5"
            width="7"
            height="7"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Rect
            x="13.5"
            y="13.5"
            width="7"
            height="7"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Rect
            x="3.5"
            y="13.5"
            width="7"
            height="7"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
export const GridIcon = ShortcutIcon;

/**
 * 🔄 Refresh / Reload Icon — Modern sleek curved circular reload arrow
 */
export const RefreshIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M20 12A8 8 0 1 1 17.657 6.343L20 4V10H14"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🔔 Notification / Bell Icon — Sleek curved notification bell with clapper
 */
export const NotificationIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M13.73 21A2 2 0 0 1 10.27 21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
export const BellIcon = NotificationIcon;

/**
 * 🚪 Logout / Sign Out Icon — Door with exit arrow
 */
export const LogoutIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M9 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M16 17L21 12L16 7"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M21 12H9"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ✔️✔️ Double Checkmark / Done Icon
 */
export const CheckDoneIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M18 6L7 17L2 12"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M22 10L14.5 17.5L13 16"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🔕 Notification Off / Silent Bell Icon
 */
export const NotificationOffIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M13.73 21A2 2 0 0 1 10.27 21"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M8.66 8.66C8.24 10.38 7 14 4 17H17"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M19.14 13.5C19.7 14.88 20 16 20 17H17M18 8C18 6.4 17.3 5 16 4.05C14.7 3.1 13 2.7 11.5 3.05"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M2 2L22 22"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
export const BellOffIcon = NotificationOffIcon;

/**
 * ➡️ Arrow Right Icon
 */
export const ArrowRightIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M5 12H19M19 12L12 5M19 12L12 19"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🎓 School / Graduation / Student Icon
 */
export const SchoolIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M22 10V16M2 10L12 4L22 10L12 16L2 10Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M6 12.5V17.5C6 17.5 8.5 20 12 20C15.5 20 18 17.5 18 17.5V12.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 💳 Credit Card / Payment Icon
 */
export const CreditCardIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M2 10H22"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M6 15H10"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 🏅 Award / Ribbon / Exam Merit Icon
 */
export const AwardIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="12"
            cy="8"
            r="6"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M15.477 12.89L17 22L12 19L7 22L8.523 12.89"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
export const RibbonIcon = AwardIcon;

/**
 * ✉️ Mail / SMS / Message Icon
 */
export const MailIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M3 7L12 13L21 7"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * 📍 Location / Map Pin Icon
 */
export const LocationIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 21C16 17 20 13.4183 20 9.5C20 5.35786 16.4183 2 12 2C7.58172 2 4 5.35786 4 9.5C4 13.4183 8 17 12 21Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Circle
            cx="12"
            cy="9.5"
            r="3"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
export const MapPinIcon = LocationIcon;

/**
 * 🧭 Navigation / GPS Pointer Icon
 */
export const NavigateIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M3 11L21 3L13 21L11 13L3 11Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
export const GpsIcon = NavigateIcon;

/**
 * 📶 WiFi Network Icon
 */
export const WifiIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M5 12.55C7.03 10.74 9.4 9.8 12 9.8C14.6 9.8 16.97 10.74 19 12.55"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M1.42 9C4.54 6.13 8.12 4.7 12 4.7C15.88 4.7 19.46 6.13 22.58 9"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M8.53 16.11C9.55 15.22 10.74 14.75 12 14.75C13.26 14.75 14.45 15.22 15.47 16.11"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Circle cx="12" cy="19.5" r="1.2" fill={color} />
    </Svg>
);

/**
 * 🌐 Globe / Remote Icon
 */
export const GlobeIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="12"
            cy="12"
            r="9.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M2.5 12H21.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M12 2.5C14.5 5.5 16 8.5 16 12C16 15.5 14.5 18.5 12 21.5C9.5 18.5 8 15.5 8 12C8 8.5 9.5 5.5 12 2.5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
export const RemoteIcon = GlobeIcon;

/**
 * ℹ️ Info Circle Icon
 */
export const InfoCircleIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle
            cx="12"
            cy="12"
            r="9.5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Line
            x1="12"
            y1="16"
            x2="12"
            y2="11"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
        />
        <Circle cx="12" cy="8" r="1.2" fill={color} />
    </Svg>
);
export const InfoIcon = InfoCircleIcon;

/**
 * 📡 Radio Tower / Antenna / Broadcast Icon
 */
export const RadioTowerIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="2" stroke={color} strokeWidth={strokeWidth} />
        <Path
            d="M16.24 7.76A6 6 0 0 1 16.24 16.24M7.76 16.24A6 6 0 0 1 7.76 7.76"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
        />
        <Path
            d="M19.07 4.93A10 10 0 0 1 19.07 19.07M4.93 19.07A10 10 0 0 1 4.93 4.93"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
        />
    </Svg>
);
export const BroadcastIcon = RadioTowerIcon;

/**
 * 📋 Copy Icon — two overlapping sheets
 */
export const CopyIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect
            x="9"
            y="9"
            width="12"
            height="12"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * Web: react-native-web turns `animationKeyframes` into a CSS animation, which
 * runs on the compositor — it stays smooth while the JS thread is busy
 * rendering search results, where a JS-driven Animated loop visibly stutters.
 */
// Same shape react-native-web's own ActivityIndicator uses (array of
// keyframes, string transform, compiled through StyleSheet.create).
const webSpin = StyleSheet.create({
    spin: {
        animationDuration: "0.8s",
        animationKeyframes: [
            {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
            },
        ],
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
});

/**
 * ⏳ Spinner Icon — faint ring with a rotating arc. Animates on its own, so it
 * can be dropped in wherever a loading state replaces an icon.
 */
export const SpinnerIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 2.2,
}) => {
    const isWeb = Platform.OS === "web";
    const spin = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isWeb) return;
        const loop = Animated.loop(
            Animated.timing(spin, {
                toValue: 1,
                duration: 800,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        );
        loop.start();
        return () => loop.stop();
    }, [spin, isWeb]);

    const ring = (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Circle
                cx="12"
                cy="12"
                r="9"
                stroke={color}
                strokeOpacity={0.25}
                strokeWidth={strokeWidth}
            />
            <Path
                d="M12 3A9 9 0 0 1 21 12"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
        </Svg>
    );

    if (isWeb) {
        return <View style={webSpin.spin}>{ring}</View>;
    }

    return (
        <Animated.View
            style={{
                transform: [
                    {
                        rotate: spin.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0deg", "360deg"],
                        }),
                    },
                ],
            }}
        >
            {ring}
        </Animated.View>
    );
};

/**
 * 📞 Phone Icon — handset
 */
export const PhoneIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/**
 * ⏷ Filter / Funnel Icon
 */
export const FilterIcon: React.FC<IconProps> = ({
    size = 18,
    color = "currentColor",
    strokeWidth = 1.9,
}) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M3 5H21L14 13.2V19L10 21V13.2L3 5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
