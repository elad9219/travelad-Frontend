import React from 'react';
import './SkeletonCard.css';

const SkeletonCard: React.FC = () => {
    return (
        <div className="skeleton-card">
            {/* The pulsing gray box for the image */}
            <div className="skeleton-image"></div>
            
            {/* The pulsing lines for the text */}
            <div className="skeleton-content">
                <div className="skeleton-title"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text short"></div>
            </div>
        </div>
    );
};

export default SkeletonCard;