import React from "react";
import { get } from "../../../../../../lib/util/get";
import uniqid from "uniqid";
import { useAppState } from "../../../../../../lib/context/app";

function Upload({ addImage }) {
    const context = useAppState();
    const onChange = (e) => {
        e.persist();
        let formData = new FormData();
        for (var i = 0; i < e.target.files.length; i++)
            formData.append("images", e.target.files[i]);

        formData.append("targetPath", "catalog/" + (Math.floor(Math.random() * (9999 - 1000)) + 1000) + "/" + (Math.floor(Math.random() * (9999 - 1000)) + 1000));

        fetch(
            get(context, "productImageUploadUrl") + "/" + "catalog/" + (Math.floor(Math.random() * (9999 - 1000)) + 1000) + "/" + (Math.floor(Math.random() * (9999 - 1000)) + 1000),
            {
                method: "POST",
                body: formData,
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            }
        ).then(response => {
            if (!response.headers.get("content-type") || !response.headers.get("content-type").includes("application/json"))
                throw new TypeError("Something wrong. Please try again");

            return response.json();
        })
            .then(response => {
                if (get(response, "success") === true)
                    addImage(get(response, "data.files", []).map(i => {
                        return {
                            id: uniqid(),
                            url: i.url,
                            path: i.path
                        }
                    }));
                else {
                    //toast.error(get(response, "message", "Failed!"));
                }
            })
            .catch(
                error => {
                    //toast.error(get(error, "message", "Failed!"));
                }
            )
            .finally(() => e.target.value = null);
    };

    const id = uniqid();
    return <div className="uploader grid-item">
        <div className="uploader-icon">
            <label htmlFor={id}>
                <i className="fas fa-camera"></i>
            </label>
        </div>
        <div className="invisible">
            <input id={id} type="file" multiple onChange={onChange} />
        </div>
    </div>;
}

const Image = ({ image, removeImage }) => {
    return <div className="image grid-item" id={image.id}>
        <div className="img"><img src={image.url} /></div>
        <span className="remove btn btn-link" onClick={() => removeImage(image.id)}>

            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </span>
        <span className="zoom btn btn-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-maximize-2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
        </span>
    </div>
}

const Images = ({ id, images, addImage, removeImage }) => {
    return <div id={id} className="image-list">
        {images.map((image) => {
            return <Image key={image.id} removeImage={removeImage} image={image} />
        })}
        <Upload addImage={addImage} />
    </div>
}

export default function ProductMediaManager({ productImages, id }) {
    const [images, setImages] = React.useState(productImages);
    const [draggable, setDragable] = React.useState(null);
    React.useEffect(() => {
        if (draggable)
            draggable.destroy();

        const swappable = new Swappable.default(document.querySelectorAll(`div#${id}`), {
            draggable: 'div.image',
            handle: "div.image img"
        });
        let source = null;
        let destination = null;
        swappable.on("swappable:swapped", (event) => {
            source = event.data.dragEvent.data.source.id;
            destination = event.data.dragEvent.data.over.id;
        });

        swappable.on("swappable:stop", (event) => {
            if (!source || !destination)
                return;
            setImages(images => {
                const newImages = Array.from(images);
                let sr = images.find(image => image.id === source);
                newImages[images.findIndex(image => image.id === source)] = images.find(image => image.id === destination);
                newImages[images.findIndex(image => image.id === destination)] = sr;
                return newImages
            });
        });
        setDragable(swappable);
    }, [images])


    const addImage = (imageArray) => {
        if (draggable)
            draggable.destroy();
        setImages(images.concat(imageArray));
    }

    const removeImage = (id) => {
        if (draggable)
            draggable.destroy();
        setImages(images.filter(i => i.id !== id));
    }

    return <div className={"product-image-manager"}>
        <Images id={id} images={images} addImage={addImage} removeImage={removeImage} />
        {images.map((image, index) => {
            return <input key={index} type="hidden" name={`${id}[]`} value={image.path} />
        })}
    </div>;
}