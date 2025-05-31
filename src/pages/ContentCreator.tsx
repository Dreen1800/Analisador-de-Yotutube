import React from 'react';

function ContentCreator() {
    return (
        <div className="container mx-auto px-6 md:px-12 lg:px-20 py-4 h-full flex flex-col">
            <h1 className="text-2xl font-bold mb-4">Criador de Conteúdo</h1>
            <div className="w-full flex-grow">
                <iframe
                    src="https://dify.nexialab.com.br/chatbot/hM61lbTVtaOwWymU"
                    className="w-full h-full min-h-[50vh] md:min-h-[60vh] lg:min-h-[70vh]"
                    frameBorder="0"
                    allow="microphone"
                ></iframe>
            </div>
        </div>
    );
}

export default ContentCreator; 