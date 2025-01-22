import React from 'react';
import './Loader.css'; 

const Loader: React.FC = () => {
    return (
        <div className="loader-container">
            <div className="spinner"></div>
        </div>
    );
};

export default Loader;
